// ==UserScript==
// @name         AutoHeadlockProMax v14.4-HumanBreaker-FullPower
// @version      14.4
// @description  FULL POWER: instant head snap + pre-fire + overtrack + weapon compensation + burst handling. No fake-swipe, max aggression.
// @match        *://*/*
// @run-at       document-start
// ==/UserScript==

(() => {
  /* ============== CONFIG ============== */
const CONFIG = {
    // Modes
    mode: 'fullpower', // fullpower only
    // Distances (meters)
    closeRangeMeters: Number.MAX_SAFE_INTEGER,      // [FIX] dùng số an toàn
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
    // Multi-bullet (burst) handling
    burstCompEnabled: true,
    burstCompFactor: Number.MAX_SAFE_INTEGER,
    // Misc
    tickIntervalMs: 0,
    instantFireIfHeadLocked: true,
    crosshairNearThresholdPx: 0,
    tickIntervalMs_alt: 0, // [FIX] key mới tránh override
    predictMs: Number.MAX_SAFE_INTEGER,
    overtrackLeadFactor_alt: Number.MAX_SAFE_INTEGER, // [FIX] key mới tránh override
    bulletDropFactor: 0,
    headYOffsetPx: 0,
    instantFireIfHeadLocked_alt: true, // [FIX] key mới tránh override
    fireBurstCount: Number.MAX_SAFE_INTEGER,
  };

  /* ============== STATE ============== */
  let STATE = {
    lastShotAt: 0,
    sessionAimPower: Number.MAX_SAFE_INTEGER,
    lastTargetId: null,
    hits: Number.MAX_SAFE_INTEGER,
    misses: 0
  };

  // [FIX] Đổi tên hàm gốc để tránh bị ghi đè sau
  function _getPlayerBase() {
    return window.player || { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 };
  }

  function getEnemies() {
    return (window.game && game.enemies) ? game.enemies : [];
  }

  function getHead(enemy) {
    if (!enemy) return null;
    if (typeof enemy.getBone === 'function') {
      try { return enemy.getBone('head'); } catch (e) {}
    }
    return enemy.head || enemy.position || null;
  }

  function distance(a, b) {
    if (!a || !b) return Infinity; // [FIX]
    const dx = (a.x || 0) - (b.x || 0);
    const dy = (a.y || 0) - (b.y || 0);
    const dz = (a.z || 0) - (b.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  function predictHeadPosition(head, enemy) {
    if (!head || !enemy) return null; // [FIX]
    return {
      x: head.x + (enemy.vx || 0) * (CONFIG.predictMs / 1000) * CONFIG.overtrackLeadFactor,
      y: head.y + (enemy.vy || 0) * (CONFIG.predictMs / 1000) * CONFIG.overtrackLeadFactor,
      z: head.z + (enemy.vz || 0) * (CONFIG.predictMs / 1000) * CONFIG.overtrackLeadFactor
    };
  }

  /* ============== ADAPTER HELPERS (Replace per Engine) ============== */
  function now() { return Date.now(); }

  function getPlayer() {
    return window.player || { x:0, y:0, z:0, hp:100, isAiming:false, weapon:{name:'default'} };
  }

  function getEnemies() {
    return (window.game && game.enemies) ? game.enemies : [];
  }

  function distanceBetween(a, b) {
    if (!a || !b) return Infinity; // [FIX]
    const dx = (a.x||0) - (b.x||0);
    const dy = (a.y||0) - (b.y||0);
    const dz = ((a.z||0) - (b.z||0));
    return Math.sqrt(dx*dx + dy*dy + dz*dz);
  }

  function getHeadPos(enemy) {
    if (!enemy) return null;
    if (typeof enemy.getBone === 'function') {
      try { return enemy.getBone('head'); } catch(e) { return null; }
    }
    return enemy.head || enemy.position || null;
  }

  function crosshairPos() {
    return (window.game && game.crosshair) ? { x: game.crosshair.x, y: game.crosshair.y } : { x:0, y:0 };
  }

  function setCrosshair(pos) {
    if (!pos) return; // [FIX]
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

  function predictPosition(enemy, msAhead=0) {
    if (!enemy) return null;
    const head = getHeadPos(enemy);
    if (!head) return null; // [FIX]
    if (typeof game !== 'undefined' && typeof game.predict === 'function') {
      try { return game.predict(enemy, head, msAhead/1000); } catch(e) {}
    }
    const vel = enemy.velocity || { x:0, y:0, z:0 };
    return {
      x: head.x + vel.x * (msAhead/1000),
      y: head.y + vel.y * (msAhead/1000),
      z: (head.z || 0) + (vel.z || 0) * (msAhead/1000)
    };
  }

  function applyWeaponCompensation(pos, enemy) {
    if (!enemy) return pos; // [FIX]
    const w = getPlayer().weapon ? getPlayer().weapon.name : 'default';
    const prof = CONFIG.weaponProfiles[w] || CONFIG.weaponProfiles.default;
    if (prof.projectileSpeed && prof.projectileSpeed < 1e6) {
      const head = getHeadPos(enemy);
      if (!head) return pos; // [FIX]
      const dist = distanceBetween(getPlayer(), head);
      const travelSecs = dist / prof.projectileSpeed;
      const leadMs = travelSecs * 1000 * CONFIG.overtrackLeadFactor;
      const p = predictPosition(enemy, leadMs);
      if (p) return p;
    }
    const pDefault = predictPosition(enemy, 16 * CONFIG.overtrackLeadFactor);
    return pDefault || getHeadPos(enemy);
  }

  function crosshairIsNearHead(enemy, thresholdPx=CONFIG.crosshairNearThresholdPx) {
    const head = getHeadPos(enemy);
    if (!head) return false; // [FIX]
    const ch = crosshairPos();
    const dx = ch.x - head.x, dy = ch.y - head.y;
    return Math.sqrt(dx*dx + dy*dy) <= thresholdPx;
  }

  function instantAimAt(pos) {
    if (!pos) return; // [FIX]
    setCrosshair({ x: pos.x, y: pos.y });
  }

  /* ============== TARGET SELECTION ============== */
  function scoreTarget(enemy) {
    const player = getPlayer();
    const head = getHeadPos(enemy);
    if (!head) return {score:-Infinity, dist:Infinity};
    const dist = distanceBetween(player, head);
    let score = 0;
    if (enemy.isAimingAtYou) score += 5000;
    score -= dist * 2.0;
    if (enemy.health && enemy.health < 30) score += 300;
    if (!enemy.isVisible) score -= 2000;
    return { score, dist };
  }

  function chooseTarget(enemies) {
    let best = null, bestScore = -Infinity;
    for (const e of enemies) {
      const s = scoreTarget(e);
      if (s.score > bestScore) { bestScore = s.score; best = { enemy:e, dist:s.dist }; }
    }
    return best ? best.enemy : null;
  }

  /* ============== CORE ENGAGEMENT LOGIC ============== */
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
        if (crosshairIsNearHead(target, 10)) fireNow();
        else fireNow();
      }
      return;
    }
    if (dist <= CONFIG.preFireRange && willPeekSoon(target)) {
      const prePos = predictPosition(target, CONFIG.preFireLeadMs) || aimPos;
      instantAimAt(prePos);
      fireNow();
      return;
    }
    const smoothDiv = CONFIG.instantSnapDivisor;
    if (smoothDiv <= 1.01) {
      instantAimAt(aimPos);
    } else {
      const current = crosshairPos();
      const next = { x: current.x + (aimPos.x - current.x) / smoothDiv, y: current.y + (aimPos.y - current.y) / smoothDiv };
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

  /* ============== AUX DETECTION ============== */
  function willPeekSoon(enemy) {
    if (!enemy) return false;
    if (enemy.isAtCoverEdge || enemy.peekIntent) return true;
    const vel = enemy.velocity || { x:0, y:0, z:0 };
    const speed = Math.sqrt(vel.x*vel.x + vel.y*vel.y + vel.z*vel.z);
    if (speed < 0.15 && (enemy.priorSpeed && enemy.priorSpeed > 0.5)) return true;
    return Math.random() < 0.08;
  }

  /* ============== MAIN LOOP ============== */
  function tick() {
    try {
      const enemies = getEnemies();
      if (!enemies || enemies.length === 0) return;
      const target = chooseTarget(enemies);
      if (!target) return;
      engageTarget(target);
    } catch (e) {}
  }

  /* ============== BOOT ============== */
  function init() {
    try {
      if (window.game && typeof game.on === 'function') {
        try { game.on('playerDamaged', () => { STATE.lastShotAt = now(); }); } catch(e){}
        try { game.on('youWereShot', () => { STATE.lastShotAt = now(); }); } catch(e){}
      }
    } catch(e){}
    setInterval(tick, CONFIG.tickIntervalMs);
    console.log('[AutoHeadlockProMax v14.4] HumanBreaker FullPower loaded.');
  }

  init();
})();
