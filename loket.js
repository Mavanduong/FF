// ==UserScript==
// @name         AutoHeadlockProMax v14.4-HumanBreaker-FullPower-FIXED
// @version      14.4-fixed
// @description  FULL POWER: instant head snap + pre-fire + overtrack + weapon compensation + burst handling. No fake-swipe, max aggression.
// @match        *://*/*
// @run-at       document-start
// ==/UserScript==

(() => {
  /* ============== CONFIG ============== */
  const CONFIG = {
    // Modes
    mode: 'fullpower',
    // Distances
    closeRangeMeters: Number.MAX_SAFE_INTEGER,
    preFireRange: Number.MAX_SAFE_INTEGER,
    maxEngageDistance: Number.MAX_SAFE_INTEGER,
    // Aim power & smoothing
    instantSnapDivisor: 1.0,
    overtrackLeadFactor: Number.MAX_SAFE_INTEGER,
    // Weapon compensation profiles
    weaponProfiles: {
      default: { recoilX: 0, recoilY: 0, spreadComp: 1.0, projectileSpeed: Number.MAX_SAFE_INTEGER },
      MP40:    { recoilX: 0.0, recoilY: 0.0, spreadComp: 1.0, projectileSpeed: Number.MAX_SAFE_INTEGER },
      M1014:   { recoilX: 0.0, recoilY: 0.0, spreadComp: 1.0, projectileSpeed: Number.MAX_SAFE_INTEGER },
      Vector:  { recoilX: 0.0, recoilY: 0.0, spreadComp: 1.0, projectileSpeed: Number.MAX_SAFE_INTEGER }
    },
    // Pre-fire tuning
    preFireLeadMs: 0,
    // Multi-bullet
    burstCompEnabled: true,
    burstCompFactor: Number.MAX_SAFE_INTEGER,
    // Misc
    tickIntervalMs: 16, // 60 FPS
    instantFireIfHeadLocked: true,
    crosshairNearThresholdPx: 0,
    predictMs: Number.MAX_SAFE_INTEGER,
    bulletDropFactor: 0,
    headYOffsetPx: 0,
    headTurnPredictionMs: 150,
    stickinessPx: 4,
    stickinessHoldMs: 180,
    wallOffsetPx: 6,
    multiBulletWeapons: ['MP40', 'Vector', 'M1014'],
    recoilCompPerBullet: 0.5,
    dangerAimBonus: 5000,
    humanSwipeThresholdPx: 12,
    autoFireLeadMs: 120,
    lagCompensation: true,
    magneticBeamSmooth: 0.2
  };

  /* ============== STATE & UTILS ============== */
  const STATE = { lastShotAt: 0 };
  const now = () => Date.now();

  function distanceBetween(a, b) {
    const dx = (a.x || 0) - (b.x || 0);
    const dy = (a.y || 0) - (b.y || 0);
    const dz = (a.z || 0) - (b.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  function getPlayer() {
    return (window.game && game.player) ? game.player : {};
  }

  function getEnemies() {
    return (window.game && Array.isArray(game.enemies)) ? game.enemies : [];
  }

  /* ============== FUNCTIONS ============== */
  function getHeadPos(enemy) {
    if (!enemy) return null;
    if (typeof enemy.getBone === 'function') {
      try { return enemy.getBone('head'); } catch (e) { return null; }
    }
    return enemy.head || enemy.position || null;
  }

  function crosshairPos() {
    return (window.game && game.crosshair) ? { x: game.crosshair.x, y: game.crosshair.y } : { x: 0, y: 0 };
  }

  function setCrosshair(pos) {
    if (!pos) return;
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

  function predictPosition(enemy, msAhead = 0) {
    if (!enemy) return null;
    const head = getHeadPos(enemy);
    if (!head) return null;
    if (typeof game !== 'undefined' && typeof game.predict === 'function') {
      try { return game.predict(enemy, head, msAhead / 1000); } catch (e) {}
    }
    const vel = enemy.velocity || { x: 0, y: 0, z: 0 };
    return {
      x: head.x + vel.x * (msAhead / 1000),
      y: head.y + vel.y * (msAhead / 1000),
      z: (head.z || 0) + (vel.z || 0) * (msAhead / 1000)
    };
  }

  function crosshairIsNearHead(enemy, thresholdPx = CONFIG.crosshairNearThresholdPx) {
    const head = getHeadPos(enemy);
    if (!head) return false;
    const ch = crosshairPos();
    const dx = ch.x - head.x, dy = ch.y - head.y;
    return Math.sqrt(dx * dx + dy * dy) <= thresholdPx;
  }

  function instantAimAt(pos) {
    if (!pos) return;
    setCrosshair({ x: pos.x, y: pos.y });
  }

  function applyWeaponCompensation(pos, enemy) {
    if (!enemy) return pos;
    const w = getPlayer().weapon ? getPlayer().weapon.name : 'default';
    const prof = CONFIG.weaponProfiles[w] || CONFIG.weaponProfiles.default;
    if (prof.projectileSpeed && prof.projectileSpeed < 1e6) {
      const head = getHeadPos(enemy);
      if (!head) return pos;
      const dist = distanceBetween(getPlayer(), head);
      const travelSecs = dist / prof.projectileSpeed;
      const leadMs = travelSecs * 1000 * CONFIG.overtrackLeadFactor;
      const p = predictPosition(enemy, leadMs);
      if (p) return p;
    }
    const pDefault = predictPosition(enemy, 16 * CONFIG.overtrackLeadFactor);
    return pDefault || getHeadPos(enemy);
  }

  function scoreTarget(enemy) {
    const player = getPlayer();
    const head = getHeadPos(enemy);
    if (!head) return { score: -Infinity, dist: Infinity };
    const dist = distanceBetween(player, head);
    let score = 0;
    if (enemy.isAimingAtYou) score += CONFIG.dangerAimBonus;
    score -= dist * 2.0;
    if (enemy.health && enemy.health < 30) score += 300;
    if (!enemy.isVisible) score -= 2000;
    return { score, dist };
  }

  function chooseTarget(enemies) {
    let best = null, bestScore = -Infinity;
    for (const e of enemies) {
      const s = scoreTarget(e);
      if (s.score > bestScore) { bestScore = s.score; best = { enemy: e, dist: s.dist }; }
    }
    return best ? best.enemy : null;
  }

  function willPeekSoon(enemy) {
    if (!enemy) return false;
    if (enemy.isAtCoverEdge || enemy.peekIntent) return true;
    const vel = enemy.velocity || { x: 0, y: 0, z: 0 };
    const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);
    if (speed < 0.15 && (enemy.priorSpeed && enemy.priorSpeed > 0.5)) return true;
    return Math.random() < 0.08;
  }

  function engageTarget(target) {
    if (!target) return;
    const head = getHeadPos(target);
    if (!head) return;
    const player = getPlayer();
    const dist = distanceBetween(player, head);
    let aimPos = applyWeaponCompensation(head, target) || head;
    if (dist <= CONFIG.closeRangeMeters) {
      instantAimAt(aimPos);
      if (CONFIG.instantFireIfHeadLocked) {
        fireNow();
      }
      return;
    }
    if (dist <= CONFIG.preFireRange && willPeekSoon(target)) {
      const prePos = predictPosition(target, CONFIG.preFireLeadMs) || aimPos;
      instantAimAt(prePos);
      fireNow();
      return;
    }
    if (CONFIG.instantSnapDivisor <= 1.01) {
      instantAimAt(aimPos);
    } else {
      const current = crosshairPos();
      const next = { x: current.x + (aimPos.x - current.x) / CONFIG.instantSnapDivisor, y: current.y + (aimPos.y - current.y) / CONFIG.instantSnapDivisor };
      setCrosshair(next);
    }
    if (CONFIG.burstCompEnabled && typeof game !== 'undefined' && typeof game.autoAdjustSpray === 'function') {
      game.autoAdjustSpray(aimPos, CONFIG.burstCompFactor);
    }
    if (crosshairIsNearHead(target, 8)) {
      fireNow();
    } else {
      if (typeof game !== 'undefined' && typeof game.microCorrect === 'function') {
        game.microCorrect(aimPos);
      }
    }
  }

  function tick() {
    try {
      const enemies = getEnemies();
      if (!enemies || enemies.length === 0) return;
      const target = chooseTarget(enemies);
      if (!target) return;
      engageTarget(target);
    } catch (e) {}
  }

  function init() {
    try {
      if (window.game && typeof game.on === 'function') {
        try { game.on('playerDamaged', () => { STATE.lastShotAt = now(); }); } catch (e) {}
        try { game.on('youWereShot', () => { STATE.lastShotAt = now(); }); } catch (e) {}
      }
    } catch (e) {}
    setInterval(tick, CONFIG.tickIntervalMs);
    console.log('[AutoHeadlockProMax v14.4] HumanBreaker FullPower FIXED loaded.');
  }

  init();
})();
