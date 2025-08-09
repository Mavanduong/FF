// ==UserScript==
// @name         AutoHeadlockProMax v14.4c-MaxStats-GodMode
// @version      14.4c-GM
// @description  FULL POWER ++ : instant head snap + pre-fire + overtrack + god-tier weapon compensation + burst handling (No AntiBan).
// @match        *://*/*
// @run-at       document-start
// ==/UserScript==

(() => {
  const CONFIG = {
    mode: 'godmode',
    closeRangeMeters: 10,          // tăng để snap + fire ở xa hơn
    preFireRange: 30,               // tăng tầm pre-fire
    maxEngageDistance: 9999,        // không giới hạn
    instantSnapDivisor: 0.8,        // < 1 => ghim mạnh hơn 100%
    overtrackLeadFactor: 2.0,       // dự đoán cực xa
    preFireLeadMs: 120,             // bắn sớm hơn
    weaponProfiles: {
      default: { projectileSpeed: 9999999 },
      MP40:    { projectileSpeed: 9999999 },
      M1014:   { projectileSpeed: 9999999 },
      Vector:  { projectileSpeed: 9999999 }
    },
    instantFireIfHeadLocked: true,
    crosshairNearThresholdPx: 3,    // siết tầm chết vào đầu
    tickIntervalMs: 1,              // phản ứng cực nhanh
    burstCompEnabled: true,
    burstCompFactor: 1.25           // bù giật mạnh hơn
  };

  let STATE = { lastShotAt: 0, hits: 0, misses: 0 };

  function now(){ return Date.now(); }
  function getPlayer(){ return window.player || { x:0,y:0,z:0, hp:100, weapon:{name:'default'} }; }
  function getEnemies(){ return (window.game && game.enemies) ? game.enemies : []; }
  function distanceBetween(a,b){ const dx=(a.x||0)-(b.x||0), dy=(a.y||0)-(b.y||0), dz=(a.z||0)-(b.z||0); return Math.sqrt(dx*dx + dy*dy + dz*dz); }
  function getHeadPos(enemy){ if(!enemy) return null; if(typeof enemy.getBone === 'function') return enemy.getBone('head'); return enemy.head || enemy.position; }
  function crosshairPos(){ return (window.game && game.crosshair) ? { x: game.crosshair.x, y: game.crosshair.y } : { x:0, y:0 }; }
  function setCrosshair(pos){ if(window.game && game.crosshair){ game.crosshair.x = pos.x; game.crosshair.y = pos.y; } }
  function fireNow(){ if(window.game && typeof game.fire === 'function'){ game.fire(); STATE.lastShotAt = now(); } }

  function predictPosition(enemy, msAhead=0){
    if(!enemy) return null;
    if(typeof game !== 'undefined' && typeof game.predict === 'function'){
      try{ return game.predict(enemy, getHeadPos(enemy), msAhead/1000); } catch(e){}
    }
    const head = getHeadPos(enemy);
    const vel = enemy.velocity || { x:0,y:0,z:0 };
    return { x: head.x + vel.x*(msAhead/1000), y: head.y + vel.y*(msAhead/1000), z: (head.z||0) + (vel.z||0)*(msAhead/1000) };
  }

  function applyWeaponCompensation(enemy){
    const head = getHeadPos(enemy);
    if(!head) return null;
    const player = getPlayer();
    const wname = (player.weapon && player.weapon.name) ? player.weapon.name : 'default';
    const prof = CONFIG.weaponProfiles[wname] || CONFIG.weaponProfiles.default;
    if(prof.projectileSpeed && prof.projectileSpeed < 1e8){
      const dist = distanceBetween(player, head);
      const travelSec = dist / prof.projectileSpeed;
      const leadMs = travelSec * 1000 * CONFIG.overtrackLeadFactor;
      return predictPosition(enemy, Math.min(200, leadMs));
    }
    return predictPosition(enemy, 20 * CONFIG.overtrackLeadFactor) || head;
  }

  function crosshairIsNearHead(enemy, thresholdPx = CONFIG.crosshairNearThresholdPx){
    const head = getHeadPos(enemy);
    const ch = crosshairPos();
    if(!head) return false;
    const dx = ch.x - head.x, dy = ch.y - head.y;
    return Math.sqrt(dx*dx + dy*dy) <= thresholdPx;
  }

  function instantAimAt(pos){ if(!pos) return; setCrosshair({ x: pos.x, y: pos.y }); }

  function scoreTarget(enemy){
    const player = getPlayer();
    const head = getHeadPos(enemy);
    if(!head) return { score: -Infinity, dist: Infinity };
    const dist = distanceBetween(player, head);
    let score = 10000 - dist * 1.5;
    if(enemy.isAimingAtYou) score += 9999;
    if(enemy.health && enemy.health < 50) score += 500;
    if(!enemy.isVisible) score -= 2000;
    return { score, dist };
  }

  function chooseTarget(enemies){
    let best = null, bestScore = -Infinity;
    for(const e of enemies){
      const s = scoreTarget(e);
      if(s.score > bestScore){ bestScore = s.score; best = e; }
    }
    return best;
  }

  function willPeekSoon(enemy){
    if(!enemy) return false;
    if(enemy.isAtCoverEdge || enemy.peekIntent) return true;
    const vel = enemy.velocity || { x:0,y:0,z:0 };
    const speed = Math.sqrt(vel.x*vel.x + vel.y*vel.y + vel.z*vel.z);
    if(speed < 0.15 && (enemy.priorSpeed && enemy.priorSpeed > 0.5)) return true;
    return Math.random() < 0.15;
  }

  function engageTarget(target){
    if(!target) return;
    const head = getHeadPos(target);
    if(!head) return;
    const player = getPlayer();
    const dist = distanceBetween(player, head);
    const aimPos = applyWeaponCompensation(target) || head;

    if(dist <= CONFIG.closeRangeMeters){
      instantAimAt(aimPos);
      if(CONFIG.instantFireIfHeadLocked) fireNow();
      return;
    }

    if(dist <= CONFIG.preFireRange && willPeekSoon(target)){
      const prePos = predictPosition(target, CONFIG.preFireLeadMs) || aimPos;
      instantAimAt(prePos);
      fireNow();
      return;
    }

    instantAimAt(aimPos);

    if(CONFIG.burstCompEnabled && typeof game !== 'undefined' && typeof game.autoAdjustSpray === 'function'){
      game.autoAdjustSpray(aimPos, CONFIG.burstCompFactor);
    }

    if(crosshairIsNearHead(target, CONFIG.crosshairNearThresholdPx)) fireNow();
  }

  function tick(){
    try{
      const enemies = getEnemies();
      if(!enemies || enemies.length === 0) return;
      const target = chooseTarget(enemies);
      if(!target) return;
      engageTarget(target);
    }catch(e){}
  }

  function init(){
    try{
      if(window.game && typeof game.on === 'function'){
        try{ game.on('playerDamaged', ()=>{ STATE.lastShotAt = now(); }); }catch(e){}
      }
    }catch(e){}
    setInterval(tick, CONFIG.tickIntervalMs);
    console.log('[AutoHeadlockProMax v14.4c] MaxStats GodMode loaded.');
  }

  init();
})();
