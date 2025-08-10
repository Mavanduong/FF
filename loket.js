// ==UserScript==
// @name         AutoHeadlockProMax v14.8-DirectHeadSnap
// @version      14.8
// @description  Tâm snap thẳng vào đầu cực mạnh, không delay, vẫn giữ mượt ở xa
// @match        *://*/*
// @run-at       document-start
// ==/UserScript==

(() => {
  const CONFIG = {
    tickIntervalMs: 1,
    crosshairNearThresholdPx: 900,
    clampStepPx: 0.005, // tăng mạnh so với 0.00005 để snap nhanh hơn
    maxLeadMs: 220,
    weaponProfiles: {
      default: { projectileSpeed: 99999999, multiBulletCount: 10, burstCompFactor: 1.5 },
      MP40:    { projectileSpeed: 99999999, multiBulletCount: 19, burstCompFactor: 999999 },
      M1014:   { projectileSpeed: 99999999, multiBulletCount: 8,  burstCompFactor: 1.8 },
      Vector:  { projectileSpeed: 99999999, multiBulletCount: 12, burstCompFactor: 1.6 }
    },
    instantFireIfHeadLocked: true,
    smoothingFactorFar: 0.95,  // vẫn mượt khi xa
    smoothingFactorNear: 1.0,  // gần đầu thì không làm chậm (snap ngay)
    shakeAmplitudePx: 2.5,
    shakeNearFactor: 0.2 // khi gần đầu, shake giảm mạnh để không lệch
  };

  let STATE = {
    lastShotAt: 0,
    smoothPos: null,
    calibrationOffset: { x: 0, y: 0 },
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
  function fireNow() {
    if (window.game && typeof game.fire === 'function') {
      game.fire();
      STATE.lastShotAt = now();
    }
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function lerpPos(cur, target, t) {
    return { x: lerp(cur.x, target.x, t), y: lerp(cur.y, target.y, t) };
  }

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
    if (!enemy) return null;
    const head = getHeadPos(enemy);
    if (!head) return null;
    const vel = enemy.velocity || { x: 0, y: 0, z: 0 };
    const predicted = {
      x: head.x + vel.x * (msAhead / 1000),
      y: head.y + vel.y * (msAhead / 1000),
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
    const bullets = prof.multiBulletCount || 1;
    if (bullets <= 1) return predictUltra(enemy, leadMs);
    const positions = [];
    for (let i = 0; i < bullets; i++) positions.push(predictUltra(enemy, leadMs + i * 7));
    const avgPos = positions.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    return { x: avgPos.x / bullets, y: avgPos.y / bullets };
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
    const near = crosshairIsNearHead(target, CONFIG.crosshairNearThresholdPx);
    aimPos = applyShake(aimPos, near);
    const current = crosshairPos();
    const smoothing = near ? CONFIG.smoothingFactorNear : CONFIG.smoothingFactorFar;
    const nextPos = clampAimMove(current, aimPos, CONFIG.clampStepPx, smoothing);
    setCrosshair(nextPos);
    if (CONFIG.instantFireIfHeadLocked && near) fireNow();
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
