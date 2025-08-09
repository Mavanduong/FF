// ==UserScript==
// @name         AutoHeadlockProMax v14.7-UltraSmoothNoDelay
// @version      14.7
// @description  Mượt mà ảo mà bắn ngay lập tức, không delay fire, vẫn giữ fake shake nhẹ
// @match        *://*/*
// @run-at       document-start
// ==/UserScript==

(() => {
  const CONFIG = {
    tickIntervalMs: 1,
    crosshairNearThresholdPx: 1.5,
    clampStepPx: 0.5,
    maxLeadMs: 220,
    weaponProfiles: {
      default: { projectileSpeed: 99999999, multiBulletCount: 10, burstCompFactor: 1.5 },
      MP40:    { projectileSpeed: 99999999, multiBulletCount: 12, burstCompFactor: 1.7 },
      M1014:   { projectileSpeed: 99999999, multiBulletCount: 8,  burstCompFactor: 1.8 },
      Vector:  { projectileSpeed: 99999999, multiBulletCount: 12, burstCompFactor: 1.6 }
    },
    instantFireIfHeadLocked: true, // Bắn ngay khi tâm đủ gần đầu
    smoothingFactor: 0.3,
    shakeAmplitudePx: 2.5, // nhẹ hơn chút để vẫn ảo mà không bị giật
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

  function clampAimMove(current, target, maxStepPx = CONFIG.clampStepPx) {
    const dx = target.x - current.x;
    const dy = target.y - current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= maxStepPx) return { x: target.x, y: target.y };
    const ratio = maxStepPx / dist;
    return { x: current.x + dx * ratio, y: current.y + dy * ratio };
  }

  function predictUltra(enemy, msAhead = CONFIG.maxLeadMs) {
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

  // Auto bù offset calibration
  function autoCalibrateAim(currentPos, targetPos) {
    const errorX = targetPos.x - currentPos.x;
    const errorY = targetPos.y - currentPos.y;
    const factor = 0.15;
    STATE.calibrationOffset.x += errorX * factor;
    STATE.calibrationOffset.y += errorY * factor;
    STATE.calibrationOffset.x *= 0.85;
    STATE.calibrationOffset.y *= 0.85;
  }

  // Lắc nhẹ để tạo ảo giác vuốt tự nhiên
  function applyShake(pos) {
    const t = now();
    let shakeX = Math.sin(t / 130) * CONFIG.shakeAmplitudePx * (Math.random() * 0.6 + 0.4);
    let shakeY = Math.cos(t / 180) * CONFIG.shakeAmplitudePx * (Math.random() * 0.6 + 0.4);
    return {
      x: pos.x + shakeX,
      y: pos.y + shakeY,
    };
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

    if (prof.projectileSpeed && prof.projectileSpeed < 1e9) {
      const dist = distanceBetween(player, head);
      const travelSec = dist / prof.projectileSpeed;
      let leadMs = travelSec * 1000;
      if (leadMs > CONFIG.maxLeadMs) leadMs = CONFIG.maxLeadMs;

      const bullets = prof.multiBulletCount || 1;
      if (bullets <= 1) return predictUltra(enemy, leadMs);

      const positions = [];
      for (let i = 0; i < bullets; i++) {
        const msOffset = leadMs + i * 7;
        positions.push(predictUltra(enemy, msOffset));
      }
      const avgPos = positions.reduce((acc, p) => ({
        x: acc.x + p.x,
        y: acc.y + p.y,
      }), { x: 0, y: 0 });
      return {
        x: avgPos.x / bullets,
        y: avgPos.y / bullets,
      };
    }
    return predictUltra(enemy, CONFIG.maxLeadMs);
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

  function willPeekSoon(enemy) {
    if (!enemy) return false;
    if (enemy.isAtCoverEdge || enemy.peekIntent) return true;
    const vel = enemy.velocity || { x: 0, y: 0, z: 0 };
    const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);
    if (speed < 0.15 && (enemy.priorSpeed && enemy.priorSpeed > 0.5)) return true;
    return Math.random() < 0.22;
  }

  function engageTarget(target) {
    if (!target) return;
    const player = getPlayer();
    const head = getHeadPos(target);
    if (!head) return;
    const dist = distanceBetween(player, head);

    let aimPos = applyWeaponCompensation(target) || head;

    autoCalibrateAim(crosshairPos(), aimPos);

    // Thêm shake nhẹ để vuốt mượt, ảo tự nhiên
    aimPos = applyShake(aimPos);

    const current = crosshairPos();
    const nextPos = clampAimMove(current, aimPos, CONFIG.clampStepPx);
    const smoothNext = lerpPos(current, nextPos, CONFIG.smoothingFactor);
    setCrosshair(smoothNext);

    // Bắn ngay khi tâm gần đầu (không delay)
    if (CONFIG.instantFireIfHeadLocked && crosshairIsNearHead(target, CONFIG.crosshairNearThresholdPx)) {
      fireNow();
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

  function init() {
    try {
      if (window.game && typeof game.on === 'function') {
        try { game.on('playerDamaged', () => { STATE.lastShotAt = now(); }); } catch (e) { }
      }
    } catch (e) { }
    setInterval(tick, CONFIG.tickIntervalMs);
    console.log('[AutoHeadlockProMax v14.7] UltraSmoothNoDelay loaded');
  }

  init();

})();
