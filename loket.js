// ==UserScript==
// @name         AutoHeadlockProMax v14.5-UltraGodX
// @version      14.5
// @description  UltraGodX siêu mạnh: instant snap, multi-bullet, headturn, tick 0.5ms
// @match        *://*/*
// @run-at       document-start
// ==/UserScript==

(() => {
  const CONFIG = {
    mode: 'ultragodx',
    closeRangeMeters: 99999,
    preFireRange: 100,
    maxEngageDistance: 999999,
    instantSnapDivisor: 0.0000001,
    overtrackLeadFactor: 20.0,
    preFireLeadMs: 200,
    weaponProfiles: {
      default: { projectileSpeed: 99999999, multiBulletCount: 15, burstCompFactor: 1.7 },
      MP40:    { projectileSpeed: 99999999, multiBulletCount: 20, burstCompFactor: 1.9 },
      M1014:   { projectileSpeed: 99999999, multiBulletCount: 12, burstCompFactor: 2.0 },
      Vector:  { projectileSpeed: 99999999, multiBulletCount: 20, burstCompFactor: 1.85 }
    },
    instantFireIfHeadLocked: true,
    crosshairNearThresholdPx: 0.7,
    tickIntervalMs: 0.5,
    burstCompEnabled: true,
    clampStepPx: 2,
    maxLeadMs: 180,
    priorityHealthThreshold: 60,
    visibilityPenalty: 7000
  };

  let STATE = { lastShotAt: 0, hits: 0, misses: 0 };
  const now = () => Date.now();
  const getPlayer = () => window.player || { x:0, y:0, z:0, hp:100, weapon: { name:'default' } };
  const getEnemies = () => (window.game && game.enemies) ? game.enemies : [];

  const distanceBetween = (a,b) => {
    const dx=(a.x||0)-(b.x||0), dy=(a.y||0)-(b.y||0), dz=(a.z||0)-(b.z||0);
    return Math.sqrt(dx*dx + dy*dy + dz*dz);
  };

  const getHeadPos = enemy => {
    if(!enemy) return null;
    if(typeof enemy.getBone === 'function') return enemy.getBone('head');
    return enemy.head || enemy.position;
  };

  const crosshairPos = () => (window.game && game.crosshair) ? { x: game.crosshair.x, y: game.crosshair.y } : { x:0, y:0 };
  const setCrosshair = pos => {
    if(window.game && game.crosshair){
      game.crosshair.x = pos.x;
      game.crosshair.y = pos.y;
    }
  };

  const fireNow = () => {
    if(window.game && typeof game.fire === 'function'){
      game.fire();
      STATE.lastShotAt = now();
    }
  };

  const clampAimMove = (current, target, maxStepPx=CONFIG.clampStepPx) => {
    const dx = target.x - current.x;
    const dy = target.y - current.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if(dist <= maxStepPx) return { x: target.x, y: target.y };
    const ratio = maxStepPx / dist;
    return { x: current.x + dx*ratio, y: current.y + dy*ratio };
  };

  const predictHeadTurn = (enemy, msAhead = CONFIG.maxLeadMs) => {
    const head = getHeadPos(enemy);
    if(!head) return null;

    const yaw = enemy.rotation?.yaw || 0;
    const pitch = enemy.rotation?.pitch || 0;

    enemy.prevYaw = enemy.prevYaw ?? yaw;
    enemy.prevPitch = enemy.prevPitch ?? pitch;

    const smoothFactor = 0.75;
    const yawSpeed = (yaw - enemy.prevYaw) * smoothFactor;
    const pitchSpeed = (pitch - enemy.prevPitch) * smoothFactor;

    enemy.prevYaw = yaw;
    enemy.prevPitch = pitch;

    const futureYaw = yaw + yawSpeed * (msAhead / 1000);
    const futurePitch = pitch + pitchSpeed * (msAhead / 1000);

    const offsetRadius = 0.18;
    const offsetX = Math.cos(futureYaw) * offsetRadius;
    const offsetY = Math.sin(futureYaw) * offsetRadius;
    const offsetZ = Math.sin(futurePitch) * offsetRadius;

    return { x: head.x + offsetX, y: head.y + offsetY, z: (head.z || 0) + offsetZ };
  };

  const predictPosition = (enemy, msAhead=0) => {
    if(!enemy) return null;
    if(typeof game !== 'undefined' && typeof game.predict === 'function'){
      try { return game.predict(enemy, getHeadPos(enemy), msAhead / 1000); } catch(e) {}
    }
    const head = getHeadPos(enemy);
    const vel = enemy.velocity || { x:0, y:0, z:0 };
    return { x: head.x + vel.x * (msAhead / 1000), y: head.y + vel.y * (msAhead / 1000), z: (head.z || 0) + (vel.z || 0) * (msAhead / 1000) };
  };

  const predictUltra = (enemy, msAhead = CONFIG.maxLeadMs) => {
    const headTurnPos = predictHeadTurn(enemy, msAhead);
    const linearPos = predictPosition(enemy, msAhead);
    if(!headTurnPos) return linearPos;
    if(!linearPos) return headTurnPos;
    return {
      x: headTurnPos.x * 0.85 + linearPos.x * 0.15,
      y: headTurnPos.y * 0.85 + linearPos.y * 0.15,
      z: headTurnPos.z * 0.85 + linearPos.z * 0.15
    };
  };

  const applyWeaponCompensation = enemy => {
    const head = getHeadPos(enemy);
    if(!head) return null;

    const player = getPlayer();
    const wname = (player.weapon && player.weapon.name) ? player.weapon.name : 'default';
    const prof = CONFIG.weaponProfiles[wname] || CONFIG.weaponProfiles.default;

    if(prof.projectileSpeed && prof.projectileSpeed < 1e9){
      const dist = distanceBetween(player, head);
      const travelSec = dist / prof.projectileSpeed;
      let leadMs = travelSec * 1000 * CONFIG.overtrackLeadFactor;
      if(leadMs > CONFIG.maxLeadMs) leadMs = CONFIG.maxLeadMs;

      const bullets = prof.multiBulletCount || 1;
      if(bullets <= 1) return predictUltra(enemy, leadMs);

      const positions = [];
      for(let i = 0; i < bullets; i++){
        const msOffset = leadMs + i * 6.8;
        positions.push(predictUltra(enemy, msOffset));
      }
      const avgPos = positions.reduce((acc, p) => ({
        x: acc.x + p.x,
        y: acc.y + p.y,
        z: acc.z + p.z
      }), { x:0, y:0, z:0 });
      return {
        x: avgPos.x / bullets,
        y: avgPos.y / bullets,
        z: avgPos.z / bullets
      };
    }
    return predictUltra(enemy, CONFIG.maxLeadMs);
  };

  const crosshairIsNearHead = (enemy, thresholdPx=CONFIG.crosshairNearThresholdPx) => {
    const head = getHeadPos(enemy);
    const ch = crosshairPos();
    if(!head) return false;
    const dx = ch.x - head.x, dy = ch.y - head.y;
    return Math.sqrt(dx*dx + dy*dy) <= thresholdPx;
  };

  const instantAimAt = pos => {
    if(!pos) return;
    const current = crosshairPos();
    const smoothPos = clampAimMove(current, pos, CONFIG.clampStepPx);
    setCrosshair(smoothPos);
  };

  const scoreTarget = enemy => {
    const player = getPlayer();
    const head = getHeadPos(enemy);
    if(!head) return { score: -Infinity, dist: Infinity };
    const dist = distanceBetween(player, head);

    let score = 20000 - dist * 1.05;
    if(enemy.isAimingAtYou) score += 25000;
    if(enemy.health && enemy.health < CONFIG.priorityHealthThreshold) score += 3000;
    if(!enemy.isVisible) score -= CONFIG.visibilityPenalty;
    if(enemy.isReloading) score -= 8000;

    return { score, dist };
  };

  const chooseTarget = enemies => {
    let best = null, bestScore = -Infinity;
    for(const e of enemies){
      const s = scoreTarget(e);
      if(s.score > bestScore){
        bestScore = s.score;
        best = e;
      }
    }
    return best;
  };

  const willPeekSoon = enemy => {
    if(!enemy) return false;
    if(enemy.isAtCoverEdge || enemy.peekIntent) return true;
    const vel = enemy.velocity || { x:0, y:0, z:0 };
    const speed = Math.sqrt(vel.x*vel.x + vel.y*vel.y + vel.z*vel.z);
    if(speed < 0.15 && (enemy.priorSpeed && enemy.priorSpeed > 0.5)) return true;
    return Math.random() < 0.25;
  };

  const engageTarget = target => {
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
      game.autoAdjustSpray(aimPos, CONFIG.weaponProfiles[getPlayer().weapon.name]?.burstCompFactor || 1.0);
    }

    if(crosshairIsNearHead(target, CONFIG.crosshairNearThresholdPx)) fireNow();
  };

  function tick(){
    try {
      const enemies = getEnemies();
      if(!enemies || enemies.length === 0) return;
      const target = chooseTarget(enemies);
      if(!target) return;
      engageTarget(target);
    } catch(e){}
  }

  function init(){
    try {
      if(window.game && typeof game.on === 'function'){
        try{ game.on('playerDamaged', ()=>{ STATE.lastShotAt = now(); }); }catch(e){}
      }
    } catch(e){}
    setInterval(tick, CONFIG.tickIntervalMs);
    console.log("[AutoHeadlockProMax v14.5-UltraGodX] loaded.");
  }

  init();
})();
