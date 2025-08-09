// ==UserScript==
// @name         AutoHeadlockProMax v14.4c-HumanBreaker-FullPower-NoAntiBan
// @version      14.4c
// @description  FULL POWER: instant head snap + pre-fire + overtrack + weapon compensation + burst handling. AntiBan removed (max performance).
// @match        *://*/*
// @run-at       document-start
// ==/UserScript==

(() => {
  /* ============== CONFIG ============== */
  const CONFIG = {
    // mode
    mode: 'fullpower',
    // distances (meters)
    closeRangeMeters: 6,      // <= this => instant snap + instant fire
    preFireRange: 18,
    maxEngageDistance: 250,
    // aim & smoothing
    instantSnapDivisor: 1.0,      // 1 => full snap
    overtrackLeadFactor: 1.25,    // lead factor for moving targets
    preFireLeadMs: 60,            // ms to pre-fire before peek
    // weapons (tweak per-engine)
    weaponProfiles: {
      default: { projectileSpeed: 999999 },
      MP40:    { projectileSpeed: 1400 },
      M1014:   { projectileSpeed: 1200 },
      Vector:  { projectileSpeed: 1500 }
    },
    // fire thresholds
    instantFireIfHeadLocked: true,
    crosshairNearThresholdPx: 6,
    // loop
    tickIntervalMs: 6,
    burstCompEnabled: true,
    burstCompFactor: 1.12
  };

  /* ============== STATE ============== */
  let STATE = {
    lastShotAt: 0,
    hits: 0,
    misses: 0
  };

  /* ============== UTILITIES / ADAPTERS ============== */
  function now(){ return Date.now(); }

  // Replace/adapt these to your game's actual objects/APIs:
  function getPlayer(){
    return window.player || { x:0,y:0,z:0, hp:100, weapon:{name:'default'} };
  }

  function getEnemies(){
    return (window.game && game.enemies) ? game.enemies : [];
  }

  function distanceBetween(a,b){
    const dx=(a.x||0)-(b.x||0), dy=(a.y||0)-(b.y||0), dz=(a.z||0)-(b.z||0);
    return Math.sqrt(dx*dx + dy*dy + dz*dz);
  }

  function getHeadPos(enemy){
    if(!enemy) return null;
    if(typeof enemy.getBone === 'function') return enemy.getBone('head');
    return enemy.head || enemy.position;
  }

  function crosshairPos(){
    return (window.game && game.crosshair) ? { x: game.crosshair.x, y: game.crosshair.y } : { x:0, y:0 };
  }

  function setCrosshair(pos){
    if(window.game && game.crosshair){
      game.crosshair.x = pos.x;
      game.crosshair.y = pos.y;
    }
  }

  function fireNow(){
    if(window.game && typeof game.fire === 'function'){
      game.fire();
      STATE.lastShotAt = now();
    }
  }

  /* ============== PREDICTION & COMPENSATION ============== */
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
    // lead time approximation
    if(prof.projectileSpeed && prof.projectileSpeed < 1e6){
      const dist = distanceBetween(player, head);
      const travelSec = dist / prof.projectileSpeed;
      const leadMs = travelSec * 1000 * CONFIG.overtrackLeadFactor;
      return predictPosition(enemy, Math.min(200, leadMs));
    }
    // default small lead
    return predictPosition(enemy, 16 * CONFIG.overtrackLeadFactor) || head;
  }

  function crosshairIsNearHead(enemy, thresholdPx = CONFIG.crosshairNearThresholdPx){
    const head = getHeadPos(enemy);
    const ch = crosshairPos();
    if(!head) return false;
    const dx = ch.x - head.x, dy = ch.y - head.y;
    return Math.sqrt(dx*dx + dy*dy) <= thresholdPx;
  }

  function instantAimAt(pos){
    if(!pos) return;
    setCrosshair({ x: pos.x, y: pos.y });
  }

  /* ============== TARGET SELECTION ============== */
  function scoreTarget(enemy){
    const player = getPlayer();
    const head = getHeadPos(enemy);
    if(!head) return { score: -Infinity, dist: Infinity };
    const dist = distanceBetween(player, head);
    let score = 0;
    if(enemy.isAimingAtYou) score += 5000;
    score -= dist * 2.0;
    if(enemy.health && enemy.health < 30) score += 300;
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

  /* ============== ENGAGEMENT LOGIC ============== */
  function willPeekSoon(enemy){
    if(!enemy) return false;
    if(enemy.isAtCoverEdge || enemy.peekIntent) return true;
    const vel = enemy.velocity || { x:0,y:0,z:0 };
    const speed = Math.sqrt(vel.x*vel.x + vel.y*vel.y + vel.z*vel.z);
    if(speed < 0.15 && (enemy.priorSpeed && enemy.priorSpeed > 0.5)) return true;
    return Math.random() < 0.08;
  }

  function engageTarget(target){
    if(!target) return;
    const head = getHeadPos(target);
    if(!head) return;
    const player = getPlayer();
    const dist = distanceBetween(player, head);

    // compute aim pos using weapon compensation & overtrack
    const aimPos = applyWeaponCompensation(target) || head;

    // close-range: instant snap + instant fire
    if(dist <= CONFIG.closeRangeMeters){
      instantAimAt(aimPos);
      if(CONFIG.instantFireIfHeadLocked) fireNow();
      return;
    }

    // pre-fire when peek-likely
    if(dist <= CONFIG.preFireRange && willPeekSoon(target)){
      const prePos = predictPosition(target, CONFIG.preFireLeadMs) || aimPos;
      instantAimAt(prePos);
      fireNow();
      return;
    }

    // mid/long range: aggressive snap (near-instant)
    if(CONFIG.instantSnapDivisor <= 1.01){
      instantAimAt(aimPos);
    } else {
      const cur = crosshairPos();
      const next = { x: cur.x + (aimPos.x - cur.x)/CONFIG.instantSnapDivisor, y: cur.y + (aimPos.y - cur.y)/CONFIG.instantSnapDivisor };
      setCrosshair(next);
    }

    // burst handling if supported by engine
    if(CONFIG.burstCompEnabled && typeof game !== 'undefined' && typeof game.autoAdjustSpray === 'function'){
      game.autoAdjustSpray(aimPos, CONFIG.burstCompFactor);
    }

    if(crosshairIsNearHead(target, 8)) fireNow();
  }

  /* ============== MAIN LOOP ============== */
  function tick(){
    try{
      const enemies = getEnemies();
      if(!enemies || enemies.length === 0) return;
      const target = chooseTarget(enemies);
      if(!target) return;
      engageTarget(target);
    }catch(e){}
  }

  /* ============== INIT ============== */
  function init(){
    // hook damage events if available
    try{
      if(window.game && typeof game.on === 'function'){
        try{ game.on('playerDamaged', ()=>{ STATE.lastShotAt = now(); }); }catch(e){}
      }
    }catch(e){}
    setInterval(tick, CONFIG.tickIntervalMs);
    console.log('[AutoHeadlockProMax v14.4c] HumanBreaker FullPower (No AntiBan) loaded.');
  }

  init();

})();

