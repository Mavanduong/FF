// ==UserScript==
// @name         AutoHeadlockProMax v14.9-BurstHeadSnap
// @version      14.9
// @description  Snap cực nhanh + Burst 7-8 viên khi lock đầu, đảm bảo chết ngay
// @match        *://*/*
// @run-at       document-start
// ==/UserScript==

(() => {
  const CONFIG = {
    tickIntervalMs: 1,
    crosshairNearThresholdPx: 900,
    clampStepPx: 0.005,
    maxLeadMs: 220,
    weaponProfiles: {
      default: { projectileSpeed: 99999999, multiBulletCount: 1, burstCompFactor: 1.5 },
      MP40:    { projectileSpeed: 99999999, multiBulletCount: 8, burstCompFactor: 1 },
      M1014:   { projectileSpeed: 99999999, multiBulletCount: 7, burstCompFactor: 1 },
      Vector:  { projectileSpeed: 99999999, multiBulletCount: 8, burstCompFactor: 1 }
    },
    instantFireIfHeadLocked: true,
    burstDelayMs: 12, // delay cực nhỏ giữa các viên trong burst
    smoothingFactorFar: 0.95,
    smoothingFactorNear: 1.0,
    shakeAmplitudePx: 2.5,
    shakeNearFactor: 0.2
  };

  let STATE = {
    lastShotAt: 0,
    smoothPos: null,
    calibrationOffset: { x: 0, y: 0 },
    bursting: false
  };

  function now() { return performance.now(); }
  function getPlayer() { return window.player || { x: 0, y: 0, z: 0, hp: 100, weapon: { name: 'default' } }; }
  function getEnemies() { return (window.game && game.enemies) ? game.enemies : []; }
  function distanceBetween(a, b) {
    const dx = (a.x || 0) - (b.x || 0), dy = (a.y || 0) - (b.y || 0), dz = (a.z || 0) - (b.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  function getHeadPos(enemy) {
    if (!enemy) return null;
    if (typeof enemy.getBone === 'function') return enemy.getBone('head');
    return enemy.head || enemy.position;
  }
  function crosshairPos() {
    if (STATE.smoothPos) return STATE.smoothPos;
    return (window.game && game.crosshair) ? { x: game.crosshair.x, y: game.crosshair.y } : { x: 0, y: 0 };
  }
  function setCrosshair(pos) {
    if (window.game && game.crosshair) {
      game.crosshair.x = pos.x;
      game.crosshair.y = pos.y;
    }
    STATE.smoothPos = pos;
  }
  function fireOnce() {
    if (window.game && typeof game.fire === 'function') {
      game.fire();
      STATE.lastShotAt = now();
    }
  }
  function burstFire(count) {
    if (STATE.bursting) return;
    STATE.bursting = true;
    let fired = 0;
    const burstLoop = () => {
      if (fired >= count) { STATE.bursting = false; return; }
      fireOnce();
      fired++;
      setTimeout(burstLoop, CONFIG.burstDelayMs);
    };
    burstLoop();
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clampAimMove(current, target, maxStepPx, smoothing) {
    const dx = target.x - current.x;
    const dy = target.y - current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= maxStepPx) return { x: target.x, y: target.y };
    const ratio = maxStepPx / dist;
    const clamped = { x: current.x + dx * ratio, y: current.y + dy * ratio };
    return {
      x: current.x + (clamped.x - current.x) * smoothing,
      y: current.y + (clamped.y - current.y) * smoothing
    };
  }
  function predictUltra(enemy, msAhead) {
    const head = getHeadPos(enemy);
    if (!head) return null;
    const vel = enemy.velocity || { x: 0, y: 0, z: 0 };
    const predicted = {
      x: head.x + vel.x * (msAhead / 1000),
      y: head.y + vel.y * (msAhead / 1000)
    };
    predicted.x += STATE.calibrationOffset.x;
    predicted.y += STATE.calibrationOffset.y;
    return predicted;
  }
  function autoCalibrateAim(currentPos, targetPos) {
    const errorX = targetPos.x - currentPos.x;
    const errorY = targetPos.y - currentPos.y;
    const factor = 0.15;
    STATE.calibrationOffset.x += errorX * factor;
    STATE.calibrationOffset.y += errorY * factor;
    STATE.calibrationOffset.x *= 0.85;
    STATE.calibrationOffset.y *= 0.85;
  }
  function applyShake(pos, near) {
    const t = now();
    const amp = near ? CONFIG.shakeAmplitudePx * CONFIG.shakeNearFactor : CONFIG.shakeAmplitudePx;
    let shakeX = Math.sin(t / 130) * amp * (Math.random() * 0.6 + 0.4);
    let shakeY = Math.cos(t / 180) * amp * (Math.random() * 0.6 + 0.4);
    return { x: pos.x + shakeX, y: pos.y + shakeY };
  }
  function crosshairIsNearHead(enemy, thresholdPx = CONFIG.crosshairNearThresholdPx) {
    const head = getHeadPos(enemy);
    const ch = crosshairPos();
    if (!head) return false;
    const dx = ch.x - head.x, dy = ch.y - head.y;
    return Math.sqrt(dx * dx + dy * dy) <= thresholdPx;
  }
  function applyWeaponCompensation(enemy) {
    const head = getHeadPos(enemy);
    if (!head) return null;
    const player = getPlayer();
    const wname = (player.weapon && player.weapon.name) ? player.weapon.name : 'default';
    const prof = CONFIG.weaponProfiles[wname] || CONFIG.weaponProfiles.default;
    const dist = distanceBetween(player, head);
    const travelSec = dist / prof.projectileSpeed;
    let leadMs = travelSec * 1000;
    if (leadMs > CONFIG.maxLeadMs) leadMs = CONFIG.maxLeadMs;
    return predictUltra(enemy, leadMs);
  }
  function scoreTarget(enemy) {
    const player = getPlayer();
    const head = getHeadPos(enemy);
    if (!head) return { score: -Infinity };
    const dist = distanceBetween(player, head);
    let score = 20000 - dist * 3;
    if (enemy.isAimingAtYou) score += 15000;
    if (enemy.health && enemy.health < 50) score += 1200;
    if (!enemy.isVisible) score -= 5000;
    return { score, dist };
  }
  function chooseTarget(enemies) {
    let best = null, bestScore = -Infinity;
    for (const e of enemies) {
      const s = scoreTarget(e);
      if (s.score > bestScore) { bestScore = s.score; best = e; }
    }
    return best;
  }
  function engageTarget(target) {
    const head = getHeadPos(target);
    if (!head) return;
    let aimPos = applyWeaponCompensation(target) || head;
    autoCalibrateAim(crosshairPos(), aimPos);
    const near = crosshairIsNearHead(target);
    aimPos = applyShake(aimPos, near);
    const current = crosshairPos();
    const smoothing = near ? CONFIG.smoothingFactorNear : CONFIG.smoothingFactorFar;
    const nextPos = clampAimMove(current, aimPos, CONFIG.clampStepPx, smoothing);
    setCrosshair(nextPos);
    if (CONFIG.instantFireIfHeadLocked && near && !STATE.bursting) {
      const player = getPlayer();
      const wname = (player.weapon && player.weapon.name) ? player.weapon.name : 'default';
      const prof = CONFIG.weaponProfiles[wname] || CONFIG.weaponProfiles.default;
      burstFire(prof.multiBulletCount || 1);
    }
  }
  function tick() {
    const enemies = getEnemies();
    if (!enemies.length) return;
    const target = chooseTarget(enemies);
    if (!target) return;
    engageTarget(target);
  }
  setInterval(tick, CONFIG.tickIntervalMs);
})();
