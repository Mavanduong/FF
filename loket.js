// ==UserScript==
// @name         AutoHeadlockProMax v14.9.2-FullGodBurst
// @version      14.9.2
// @description  Full power: instant head lock + full-mag dump (all bullets fired essentially at once)
// @match        *://*/*
// @run-at       document-start
// ==/UserScript==

(() => {
  'use strict';

  const CONFIG = {
    tickIntervalMs: 0.1,                 // tick cực nhanh
    crosshairNearThresholdPx: 999999,    // luôn coi là "near" để fire tức thì
    clampStepPx: Infinity,               // dịch chuyển tâm tức thì
    maxLeadMs: 1000,
    weaponProfiles: {
      default: { projectileSpeed: 999999999, multiBulletCount: 30 },
      MP40:    { projectileSpeed: 999999999, multiBulletCount: 30 },
      M1014:   { projectileSpeed: 999999999, multiBulletCount: 30 },
      Vector:  { projectileSpeed: 999999999, multiBulletCount: 30 }
    },
    instantFireIfHeadLocked: true,
    smoothingFactorFar: 1.0,
    smoothingFactorNear: 1.0,
    shakeAmplitudePx: 0,
    shakeNearFactor: 0,
    fullMagDump: true,                   // bật tính năng dump toàn bộ băng
    fullMagCountOverride: null           // nếu muốn ép số viên cụ thể, set số ở đây (ví dụ 30)
  };

  let STATE = {
    lastShotAt: 0,
    smoothPos: null,
    calibrationOffset: { x: 0, y: 0 },
    bursting: false
  };

  const now = () => performance.now();

  function getPlayer() { return window.player || { x:0,y:0,z:0, hp:100, weapon:{name:'default'} }; }
  function getEnemies() { return (window.game && game.enemies) ? game.enemies : []; }

  function distanceBetween(a,b){
    const dx=(a.x||0)-(b.x||0), dy=(a.y||0)-(b.y||0), dz=(a.z||0)-(b.z||0);
    return Math.sqrt(dx*dx+dy*dy+dz*dz);
  }

  function getHeadPos(enemy){
    if(!enemy) return null;
    if(typeof enemy.getBone === 'function') {
      try { return enemy.getBone('head'); } catch(e){ /* ignore */ }
    }
    return enemy.head || enemy.position || null;
  }

  function crosshairPos(){
    if(STATE.smoothPos) return STATE.smoothPos;
    if(window.game && game.crosshair) return { x: game.crosshair.x, y: game.crosshair.y };
    return { x:0, y:0 };
  }

  function setCrosshair(pos){
    if(!pos) return;
    if(window.game && game.crosshair){
      try { game.crosshair.x = pos.x; game.crosshair.y = pos.y; } catch(e) {}
    }
    STATE.smoothPos = { x: pos.x, y: pos.y };
  }

  function fireOnce(){
    if(window.game && typeof game.fire === 'function'){
      try { game.fire(); STATE.lastShotAt = now(); } catch(e){}
    }
  }

  // Full-mag dump: gọi fire() liên tiếp trong cùng tick (gần như đồng thời)
  function fullMagDump(count){
    if(STATE.bursting) return;
    STATE.bursting = true;
    try {
      // Nếu game.fire() là async hoặc có cooldown nội bộ, gọi liên tiếp vẫn là cách "max"
      for(let i=0;i<count;i++){
        fireOnce();
      }
    } catch(e) {
      // fallback: bật setTimeout nếu loop thẳng gặp lỗi
      let fired = 0;
      const loop = () => {
        if(fired >= count){ STATE.bursting = false; return; }
        fireOnce(); fired++;
        setTimeout(loop, 0);
      };
      loop();
      return;
    }
    STATE.bursting = false;
  }

  function predictUltra(enemy, msAhead){
    const head = getHeadPos(enemy);
    if(!head) return null;
    const vel = enemy.velocity || { x:0,y:0,z:0 };
    const predicted = {
      x: head.x + vel.x * (msAhead/1000),
      y: head.y + vel.y * (msAhead/1000)
    };
    predicted.x += STATE.calibrationOffset.x;
    predicted.y += STATE.calibrationOffset.y;
    return predicted;
  }

  function applyWeaponCompensation(enemy){
    const head = getHeadPos(enemy);
    if(!head) return null;
    const player = getPlayer();
    const wname = (player.weapon && player.weapon.name) ? player.weapon.name : 'default';
    const prof = CONFIG.weaponProfiles[wname] || CONFIG.weaponProfiles.default;
    const dist = distanceBetween(player, head);
    const travelSec = dist / prof.projectileSpeed;
    let leadMs = travelSec * 1000;
    if(leadMs > CONFIG.maxLeadMs) leadMs = CONFIG.maxLeadMs;
    return predictUltra(enemy, leadMs);
  }

  function scoreTarget(enemy){
    const player = getPlayer();
    const head = getHeadPos(enemy);
    if(!head) return { score: -Infinity };
    const dist = distanceBetween(player, head);
    let score = 20000 - dist*3;
    if(enemy.isAimingAtYou) score += 15000;
    if(enemy.health && enemy.health < 50) score += 1200;
    if(!enemy.isVisible) score -= 5000;
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

  function clampAimMove(current, target){
    // instant teleport aim (no smoothing)
    return { x: target.x, y: target.y };
  }

  function autoCalibrateAim(currentPos, targetPos){
    const errorX = targetPos.x - currentPos.x;
    const errorY = targetPos.y - currentPos.y;
    const factor = 0.15;
    STATE.calibrationOffset.x += errorX * factor;
    STATE.calibrationOffset.y += errorY * factor;
    STATE.calibrationOffset.x *= 0.85;
    STATE.calibrationOffset.y *= 0.85;
  }

  function crosshairIsNearHead(enemy, thresholdPx = CONFIG.crosshairNearThresholdPx){
    const head = getHeadPos(enemy);
    const ch = crosshairPos();
    if(!head) return false;
    const dx = ch.x - head.x, dy = ch.y - head.y;
    return Math.sqrt(dx*dx + dy*dy) <= thresholdPx;
  }

  function engageTarget(target){
    const head = getHeadPos(target);
    if(!head) return;
    let aimPos = applyWeaponCompensation(target) || head;
    autoCalibrateAim(crosshairPos(), aimPos);
    const nextPos = clampAimMove(crosshairPos(), aimPos);
    setCrosshair(nextPos);

    if(CONFIG.instantFireIfHeadLocked && crosshairIsNearHead(target) && !STATE.bursting){
      const player = getPlayer();
      const wname = (player.weapon && player.weapon.name) ? player.weapon.name : 'default';
      const prof = CONFIG.weaponProfiles[wname] || CONFIG.weaponProfiles.default;
      const desiredCount = CONFIG.fullMagCountOverride || prof.multiBulletCount || 30;
      if(CONFIG.fullMagDump){
        fullMagDump(desiredCount);
      } else {
        // default burst: call fireOnce repeatedly (still maximal)
        for(let i=0;i<(prof.multiBulletCount||1);i++) fireOnce();
      }
    }
  }

  function tick(){
    const enemies = getEnemies();
    if(!enemies || !enemies.length) return;
    const target = chooseTarget(enemies);
    if(!target) return;
    engageTarget(target);
  }

  // start ticking
  setInterval(tick, CONFIG.tickIntervalMs);

  // expose for runtime tweaking (console)
  try { window.AutoHeadlockProMax = { CONFIG, STATE }; } catch(e){}

})();
