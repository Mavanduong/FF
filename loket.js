// ==UserScript==
// @name         AutoHeadlockProMax v15.1-UltraGodMode
// @version      15.1
// @description  Max all config: headlock 1000000000000%, smooth tuyệt đối, clamp nhỏ nhất, dự đoán cực đại, AntiBan ảo không thể phát hiện
// @match        *://*/*
// @run-at       document-start
// ==/UserScript==

(() => {
  const CONFIG = {
    tickIntervalMs: 1,                      // Tick nhanh nhất có thể
    closeRangeMeters: 999999,               // Mọi khoảng cách đều instant snap
    preFireRange: 999999,                   // Pre-fire toàn bộ map
    maxEngageDistance: 99999999,
    instantFireIfHeadLocked: true,
    crosshairNearThresholdPx: 0.1,          // Gần như chỉ bắn khi chạm đầu cực sát
    clampStepPx: 0.1,                       // Di chuyển cực nhỏ tránh overshoot
    calibCorrectionFactor: 1.0,             // Auto-calibrate bù lệch cực nhanh
    smoothingFactor: 0.05,                   // Mượt như bơ, cực chậm trượt ảo
    overtrackLeadFactor: 99999999,          // Dự đoán cực đại, vẽ cả tương lai
    maxLeadMs: 9999,
    multiBulletDelayMs: 1,                   // Delay giữa viên cực thấp
    weaponProfiles: {
      default: { projectileSpeed: 9999999999, multiBulletCount: 100, burstCompFactor: 99999999 },
      MP40:    { projectileSpeed: 9999999999, multiBulletCount: 150, burstCompFactor: 99999999 },
      M1014:   { projectileSpeed: 9999999999, multiBulletCount: 100, burstCompFactor: 99999999 },
      Vector:  { projectileSpeed: 9999999999, multiBulletCount: 150, burstCompFactor: 99999999 }
    }
  };

  let STATE = { lastShotAt: 0, hits: 0, misses: 0 };
  let calibrationOffset = { x: 0, y: 0 };
  let smoothPos = null;

  function now() { return Date.now(); }
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
    return (window.game && game.crosshair) ? { x: game.crosshair.x, y: game.crosshair.y } : { x: 0, y: 0 };
  }
  function setCrosshair(pos) {
    if (window.game && game.crosshair) {
      game.crosshair.x = pos.x;
      game.crosshair.y = pos.y;
    }
  }
  function fireNow() {
    if (window.game && typeof game.fire === 'function') {
      game.fire();
      STATE.lastShotAt = now();
    }
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }
  function lerpPos(a, b, t) {
    return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
  }

  function clampAimMove(current, target, maxStepPx = CONFIG.clampStepPx) {
    const dx = target.x - current.x;
    const dy = target.y - current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= maxStepPx) return { x: target.x, y: target.y };
    const ratio = maxStepPx / dist;
    return { x: current.x + dx * ratio, y: current.y + dy * ratio };
  }

  function predictPosition(enemy, msAhead = 0) {
    if (!enemy) return null;
    if (typeof game !== 'undefined' && typeof game.predict === 'function') {
      try { return game.predict(enemy, getHeadPos(enemy), msAhead / 1000); } catch (e) { }
    }
    const head = getHeadPos(enemy);
    const vel = enemy.velocity || { x: 0, y: 0, z: 0 };
    return { x: head.x + vel.x * (msAhead / 1000), y: head.y + vel.y * (msAhead / 1000), z: (head.z || 0) + (vel.z || 0) * (msAhead / 1000) };
  }

  function applyWeaponCompensation(enemy) {
    const head = getHeadPos(enemy);
    if (!head) return null;
    const player = getPlayer();
    const wname = (player.weapon && player.weapon.name) ? player.weapon.name : 'default';
    const prof = CONFIG.weaponProfiles[wname] || CONFIG.weaponProfiles.default;

    if (prof.projectileSpeed && prof.projectileSpeed < 1e10) {
      const dist = distanceBetween(player, head);
      const travelSec = dist / prof.projectileSpeed;
      let leadMs = travelSec * 1000 * CONFIG.overtrackLeadFactor;
      if (leadMs > CONFIG.maxLeadMs) leadMs = CONFIG.maxLeadMs;

      const bullets = prof.multiBulletCount || 1;
      if (bullets <= 1) return predictPosition(enemy, leadMs);

      const positions = [];
      for (let i = 0; i < bullets; i++) {
        const msOffset = leadMs + i * CONFIG.multiBulletDelayMs;
        positions.push(predictPosition(enemy, msOffset));
      }
      const avgPos = positions.reduce((acc, p) => ({
        x: acc.x + p.x,
        y: acc.y + p.y,
        z: acc.z + (p.z || 0)
      }), { x: 0, y: 0, z: 0 });

      return {
        x: avgPos.x / bullets,
        y: avgPos.y / bullets,
        z: avgPos.z / bullets
      };
    }
    return predictPosition(enemy, CONFIG.maxLeadMs);
  }

  function autoCalibrateAim(currentPos, targetPos) {
    const errorX = targetPos.x - currentPos.x;
    const errorY = targetPos.y - currentPos.y;
    calibrationOffset.x += errorX * CONFIG.calibCorrectionFactor;
    calibrationOffset.y += errorY * CONFIG.calibCorrectionFactor;
  }

  function crosshairIsNearHead(enemy, thresholdPx = CONFIG.crosshairNearThresholdPx) {
    const head = getHeadPos(enemy);
    const ch = crosshairPos();
    if (!head) return false;
    const dx = ch.x - head.x, dy = ch.y - head.y;
    return Math.sqrt(dx * dx + dy * dy) <= thresholdPx;
  }

  function smoothAimTo(targetPos) {
    const current = smoothPos || crosshairPos();
    const calibratedTarget = {
      x: targetPos.x + calibrationOffset.x,
      y: targetPos.y + calibrationOffset.y
    };
    let lerped = lerpPos(current, calibratedTarget, CONFIG.smoothingFactor);
    smoothPos = clampAimMove(current, lerped, CONFIG.clampStepPx);
    setCrosshair(smoothPos);
  }

  function scoreTarget(enemy) {
    const player = getPlayer();
    const head = getHeadPos(enemy);
    if (!head) return { score: -Infinity, dist: Infinity };
    const dist = distanceBetween(player, head);
    let score = 15000 - dist * 1.2;
    if (enemy.isAimingAtYou) score += 25000;
    if (enemy.health && enemy.health < 40) score += 1200;
    if (!enemy.isVisible) score -= 7000;
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

  function willPeekSoon(enemy) {
    if (!enemy) return false;
    if (enemy.isAtCoverEdge || enemy.peekIntent) return true;
    const vel = enemy.velocity || { x: 0, y: 0, z: 0 };
    const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);
    if (speed < 0.15 && (enemy.priorSpeed && enemy.priorSpeed > 0.5)) return true;
    return Math.random() < 0.2;
  }

  function engageTarget(target) {
    if (!target) return;
    const player = getPlayer();
    const dist = distanceBetween(player, getHeadPos(target));
    const aimPos = applyWeaponCompensation(target) || getHeadPos(target);
    autoCalibrateAim(smoothPos || crosshairPos(), aimPos);
    smoothAimTo(aimPos);
    if (crosshairIsNearHead(target, CONFIG.crosshairNearThresholdPx)) {
      if (CONFIG.instantFireIfHeadLocked) fireNow();
    }
  }

  function tick() {
    try {
      const enemies = getEnemies();
      if (!enemies || enemies.length === 0) return;
      const target = chooseTarget(enemies);
      if (!target) return;
      engageTarget(target);
    } catch (e) { }
  }

  function antiBanSimulateHumanBehavior() {
    const delay = Math.random() * 5;
    if (smoothPos) {
      smoothPos.x += (Math.random() - 0.5) * 0.005;
      smoothPos.y += (Math.random() - 0.5) * 0.005;
    }
    CONFIG.smoothingFactor = 0.04 + Math.sin(now() / 500) * 0.01;
  }

  function init() {
    try {
      if (window.game && typeof game.on === 'function') {
        try { game.on('playerDamaged', () => { STATE.lastShotAt = now(); }); } catch (e) { }
      }
    } catch (e) { }
    setInterval(() => {
      antiBanSimulateHumanBehavior();
      tick();
    }, CONFIG.tickIntervalMs);
  }

  init();
})();
