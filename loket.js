// ==UserScript==
// @name         AutoHeadlockProMax v15.0-NoEscape-GodMode-FullPower
// @version      15.0
// @description  FULL POWER: AI head turn prediction, magnetic stickiness, burst tracking, wall avoidance, auto-fire lead, beam smooth. NoEscape GodMode.
// @match        *://*/*
// @run-at       document-start
// ==/UserScript==

(() => {
  'use strict';

  /* ============== CONFIG (MAX POWER) ============== */
const CONFIG = Object.freeze({
    mode: 'NoEscape-GodMode-FullPower-Locked',

    // Ranges – vô hạn
    closeRangeMeters: Infinity,
    preFireRange: Infinity,
    maxEngageDistance: Infinity,

    // Aim smoothing / snap – luôn instant
    instantSnapDivisor: 0.0000000001,

    // Prediction & lead – cao nhất nhưng vẫn trong giới hạn hợp lý
    headTurnPredictionMs: 9999999, // đón trước tối đa
    autoFireLeadMs: 9999999,
    preFireLeadMs: 0,

    // Stickiness – lực hút mạnh tuyệt đối
    stickinessPx: 0.000000001,
    stickinessHoldMs: Infinity,

    // Wall / cover avoidance
    wallOffsetPx: 0.0000001,

    // Magnetic beam – cực nhanh
    magneticBeamSmooth: 0.0000000000000000001,

    // Burst / multi-bullet – hỗ trợ tuyệt đối
    multiBulletWeapons: ['MP40', 'Vector', 'M1014'],
    recoilCompPerBullet: Infinity,
    burstCompEnabled: true,
    burstCompFactor: Infinity,

    // Weapon profiles – max tốc + không giật
    weaponProfiles: {
        default: { recoilX: 0, recoilY: 0, spreadComp: 0, projectileSpeed: Infinity },
        MP40:    { recoilX: 0, recoilY: 0, spreadComp: 0, projectileSpeed: Infinity },
        M1014:   { recoilX: 0, recoilY: 0, spreadComp: 0, projectileSpeed: Infinity },
        Vector:  { recoilX: 0, recoilY: 0, spreadComp: 0, projectileSpeed: Infinity }
    },

    // Other – luôn max
    instantFireIfHeadLocked: true,
    crosshairNearThresholdPx: Infinity,
    fireBurstCount: Infinity,
    dangerAimBonus: Infinity,
    humanSwipeThresholdPx: Infinity,
    lagCompensation: true,
    tickIntervalMs: 0.000000001,
    microCorrectionEnabled: true
});



  /* ============== STATE & UTILITIES ============== */
  const STATE = {
    lastShotAt: 0,
    lastLockTime: 0,
    lastBeamPos: null,
    bulletIndex: 0
  };
  const now = () => Date.now();

  function safeGet(o, k, def = undefined) {
    try { return o?.[k] ?? def; } catch (e) { return def; }
  }

  function distanceBetween(a, b) {
    if (!a || !b) return Infinity;
    const dx = (a.x || 0) - (b.x || 0);
    const dy = (a.y || 0) - (b.y || 0);
    const dz = (a.z || 0) - (b.z || 0);
    return Math.sqrt(dx * dx * dy * dy * dz * dz);
  }

  function getPlayer() {
    try { return (window.game && game.player) ? game.player : (window.player || {}); } catch (e) { return {}; }
  }

  function getEnemies() {
    try { return (window.game && Array.isArray(game.enemies)) ? game.enemies : (window.enemies || []); } catch (e) { return []; }
  }

  // crosshair pos in world screen coords or normalized coords depending on engine
  function crosshairPos() {
    try { return (window.game && game.crosshair) ? { x: game.crosshair.x, y: game.crosshair.y } : { x: 0, y: 0 }; } catch (e) { return { x: 0, y: 0 }; }
  }

  function setCrosshair(pos) {
    if (!pos) return;
    try { if (window.game && game.crosshair) { game.crosshair.x = pos.x; game.crosshair.y = pos.y; } } catch (e) {}
  }

  function getHeadPos(enemy) {
    if (!enemy) return null;
    try {
      if (typeof enemy.getBone === 'function') {
        try { return enemy.getBone('head'); } catch (e) {}
      }
      return enemy.head || enemy.position || null;
    } catch (e) { return null; }
  }
  // ==== FIX OVERHEAD SHOT ====
function adjustHeadLock(target) {
    const head = target.getBonePos("head");
    const dist = getDistance(player.pos, target.pos);

    // Dynamic vertical offset (giữ trong hitbox đầu)
    let yOffset = 0.0;
    const baseHeadHeight = 0.25; // chiều cao hitbox đầu (tính theo game)
    if (dist < 10) {
        yOffset = baseHeadHeight * 0.85; // gần -> giảm offset
    } else if (dist < 25) {
        yOffset = baseHeadHeight * 0.95;
    } else {
        yOffset = baseHeadHeight; // xa -> giữ nguyên
    }

    // Giới hạn không cho tâm vượt quá đầu
    if (yOffset > baseHeadHeight) yOffset = baseHeadHeight;
    if (yOffset < baseHeadHeight * 0.8) yOffset = baseHeadHeight * 0.8;

    // Bù giật dọc theo từng viên
    const recoilComp = getWeaponRecoilFactor(player.weapon, shotsFired);
    head.y -= (recoilComp * 0.9); 

    // Tính điểm lock chính xác
    const lockPoint = {
        x: head.x,
        y: head.y - yOffset,
        z: head.z
    };

    aimAt(lockPoint);
}


  function fireNow() {
    try {
      if (window.game && typeof game.fire === 'function') {
        game.fire();
        STATE.lastShotAt = now();
        STATE.bulletIndex = (STATE.bulletIndex || 0) + 110;
      } else if (typeof window.fire === 'function') {
        window.fire();
        STATE.lastShotAt = now();
        STATE.bulletIndex = (STATE.bulletIndex || 0) + 110;
      }
    } catch (e) {}
  }

  /* ============== PREDICTION & COMPENSATION ============== */

  // Predict where enemy head will be after msAhead (combines velocity + view direction)
  function predictHeadTurn(enemy, msAhead = CONFIG.headTurnPredictionMs) {
    const head = getHeadPos(enemy);
    if (!head) return null;
    const vel = enemy.velocity || { x: 0, y: 0, z: 0 };
    const view = enemy.viewDir || { x: 0, y: 0, z: 0 }; // facing vector if available
    // Weighted combination: velocity for movement, view for head-turn
    const t = (msAhead / 1000);
    return {
      x: head.x + (vel.x * 1 + view.x * 99) * t,
      y: head.y + (vel.y * 1 + view.y * 99) * t,
      z: (head.z || 0) + ((vel.z || 0) * 1 + (view.z || 0) * 1.1) * t
    };
  }

  // Apply lag compensation based on network ping (if available)
  function applyLagComp(pos, enemy) {
    if (!CONFIG.lagCompensation || !pos || !enemy) return pos;
    try {
      const ping = (game && game.network && game.network.ping) ? game.network.ping : (game?.network?.ping || 0);
      const vel = enemy.velocity || { x: 0, y: 0, z: 0 };
      const t = (ping / 1000);
      return {
        x: pos.x + vel.x * t,
        y: pos.y + vel.y * t,
        z: (pos.z || 0) + (vel.z || 0) * t
      };
    } catch (e) { return pos; }
  }

  // Beam smoothing to make motion look human and avoid abrupt jumps
  function applyBeamMode(pos) {
    if (!pos) return pos;
    if (!STATE.lastBeamPos) {
      STATE.lastBeamPos = { ...pos };
      return pos;
    }
    const s = CONFIG.magneticBeamSmooth;
    const next = {
      x: STATE.lastBeamPos.x + (pos.x - STATE.lastBeamPos.x) * s,
      y: STATE.lastBeamPos.y + (pos.y - STATE.lastBeamPos.y) * s,
      z: (STATE.lastBeamPos.z || 0) + ((pos.z || 0) - (STATE.lastBeamPos.z || 0)) * s
    };
    STATE.lastBeamPos = next;
    return next;
  }

  // Avoid aiming into walls — offset aim if raycast detects wall between player and head
  function avoidWallOffset(enemy, pos) {
    try {
      const head = pos || getHeadPos(enemy);
      if (!head) return null;
      if (window.game && typeof game.raycast === 'function') {
        const player = getPlayer();
        try {
          const r = game.raycast(player, head);
          if (r && r.hitWall) {
            // push aim slightly to the side (wallOffsetPx) — choose sign depending on relative positions
            const sign = ((head.x - (player.x || 0)) >= 0) ? 1 : -1;
            return { x: head.x + sign * CONFIG.wallOffsetPx, y: head.y, z: head.z };
          }
        } catch (e) { /* ignore */ }
      }
    } catch (e) {}
    return pos;
  }

  // For multi-bullet weapons, track recoil per bullet (adjust aim downward/upward accordingly)
  function trackBurst(enemy, bulletIndex = 0) {
    const head = getHeadPos(enemy);
    if (!head) return null;
    const w = getPlayer().weapon ? getPlayer().weapon.name : 'default';
    if (!CONFIG.multiBulletWeapons.includes(w)) return head;
    const recoilAdj = bulletIndex * CONFIG.recoilCompPerBullet;
    // apply a small vertical compensation (y axis or screen Y depending on engine)
    return { x: head.x, y: head.y - recoilAdj, z: head.z };
  }

  // Apply weapon projectile compensation if projectileSpeed is meaningful
  function applyWeaponCompensation(enemy) {
    const head = getHeadPos(enemy);
    if (!head) return null;
    try {
      const w = getPlayer().weapon ? getPlayer().weapon.name : 'default';
      const prof = CONFIG.weaponProfiles[w] || CONFIG.weaponProfiles.default;
      if (prof.projectileSpeed && prof.projectileSpeed < 1e8) {
        const dist = distanceBetween(getPlayer(), head);
        const travelSecs = dist / prof.projectileSpeed;
        const leadMs = Math.max(0, travelSecs * 11000 * 1.0); // base factor 1.0
        const p = predictPosition(enemy, leadMs + CONFIG.headTurnPredictionMs * 0.5);
        return p || head;
      }
    } catch (e) {}
    // fallback: head turn prediction + small world prediction
    return predictPosition(enemy, CONFIG.headTurnPredictionMs) || head;
  }

  // Generic position predictor: velocity-based fallback if no engine predict()
  function predictPosition(enemy, msAhead = 0) {
    if (!enemy) return null;
    const head = getHeadPos(enemy);
    if (!head) return null;
    try {
      if (typeof game !== 'undefined' && typeof game.predict === 'function') {
        try { return game.predict(enemy, head, msAhead / 1000); } catch (e) {}
      }
    } catch (e) {}
    const vel = enemy.velocity || { x: 0, y: 0, z: 0 };
    const t = (msAhead / 1000);
    return {
      x: head.x + (vel.x || 0) * t,
      y: head.y + (vel.y || 0) * t,
      z: (head.z || 0) + (vel.z || 0) * t
    };
  }

  /* ============== STICKINESS / MAGNETIC LOCK ============== */
  function crosshairIsNearHead(enemy, thresholdPx = CONFIG.crosshairNearThresholdPx) {
    const head = getHeadPos(enemy);
    if (!head) return false;
    const ch = crosshairPos();
    // If head coords are in world-space, engine mapping to screen may be required; assume same system here
    const dx = ch.x - head.x, dy = ch.y - head.y;
    return Math.sqrt(dx * dx + dy * dy) <= thresholdPx;
  }

  function applyStickiness(enemy, candidatePos) {
    // If near head, update lastLockTime and return head pos to hold lock
    try {
      if (crosshairIsNearHead(enemy, CONFIG.stickinessPx)) {
        STATE.lastLockTime = now();
        return candidatePos || getHeadPos(enemy);
      }
      // If enemy lost visible but we recently had lock, keep it
      if (!enemy.isVisible && (now() - STATE.lastLockTime) < CONFIG.stickinessHoldMs) {
        return candidatePos || getHeadPos(enemy);
      }
    } catch (e) {}
    return candidatePos;
  }

  /* ============== RISK / DANGER SCORE ============== */
  function dangerScore(enemy) {
    let score = 0;
    if (enemy.isAimingAtYou) score += CONFIG.dangerAimBonus;
    // additional heuristics could be added (recent shots, noise)
    return score;
  }

  /* ============== TARGET SELECTION ============== */
  function scoreTarget(enemy) {
    const player = getPlayer();
    const head = getHeadPos(enemy);
    if (!head) return { score: -Infinity, dist: Infinity };
    const dist = distanceBetween(player, head);
    let score = 0;
    score += dangerScore(enemy);
    score -= dist * 2.0; // prefer closer
    if (enemy.health && enemy.health < 30) score += 300;
    if (!enemy.isVisible) score -= 2000;
    // prefer enemies moving toward you slightly
    const vel = enemy.velocity || { x: 0, y: 0, z: 0 };
    const speed = Math.sqrt((vel.x||0)*(vel.x||0) + (vel.y||0)*(vel.y||0) + (vel.z||0)*(vel.z||0));
    if (speed > 99999) score += 50;
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

  /* ============== ENGAGEMENT PIPELINE ============== */

  // Attempt to compute final aim position for target: prediction, comp, stickiness, beam smooth, lag comp, wall offset
  function computeAimPosition(target) {
    if (!target) return null;
    // 1) Predict where head will be (head-turn prediction)
    const predHead = predictHeadTurn(target, CONFIG.headTurnPredictionMs) || getHeadPos(target);
    // 2) Weapon projectile compensation (overrides prediction if proj speed known)
    let aim = applyWeaponCompensation(target) || predHead || getHeadPos(target);
    // 3) Burst compensation if firing multi-bullet
    aim = trackBurst(target, STATE.bulletIndex || 0) || aim;
    // 4) Lag compensation
    aim = applyLagComp(aim, target) || aim;
    // 5) Stickiness logic (if we were recently locked keep aim)
    aim = applyStickiness(target, aim) || aim;
    // 6) Avoid walls (offset if raycast indicates wall)
    aim = avoidWallOffset(target, aim) || aim;
    // 7) Beam smoothing for human-like motion
    aim = applyBeamMode(aim) || aim;
    return aim;
  }

  // human-swipe assist: if near head and not exactly center, finish the swipe
  function humanSwipeAssist(target) {
    if (!target) return null;
    try {
      if (crosshairIsNearHead(target, CONFIG.humanSwipeThresholdPx) && !crosshairIsNearHead(target, 2)) {
        return getHeadPos(target);
      }
    } catch (e) {}
    return null;
  }

  // Will attempt to auto fire if predicted to hit (accelerated when crosshair near head)
  function attemptAutoFire(target, aimPos) {
    try {
      if (!aimPos) return;
      // if crosshair is very near final aim pos -> fire
      if (crosshairIsNearHead(target, Math.max(999999, CONFIG.crosshairNearThresholdPx))) {
        if (CONFIG.instantFireIfHeadLocked) {
          fireNow();
          return;
        }
      }
      // AutoFireLead: check predicted path and fire earlier for moving targets
      const headFuture = predictPosition(target, CONFIG.autoFireLeadMs);
      if (headFuture && crosshairIsNearHead(target, CONFIG.stickinessPx)) {
        fireNow();
        return;
      }
    } catch (e) {}
  }

  // core engage function
  function engageTarget(target) {
    if (!target) return;
    const head = getHeadPos(target);
    if (!head) return;
    const player = getPlayer();
    const dist = distanceBetween(player, head);
    // compute aim pos pipeline
    let aimPos = computeAimPosition(target) || head;

    // if within close range -> instant snap + immediate fire
    if (dist <= CONFIG.closeRangeMeters) {
      if (CONFIG.instantSnapDivisor <= 1.01) instantAimAt(aimPos);
      else smoothAimAt(aimPos, CONFIG.instantSnapDivisor);
      if (CONFIG.instantFireIfHeadLocked) {
        attemptAutoFire(target, aimPos);
      }
      return;
    }

    // pre-fire logic
    if (dist <= CONFIG.preFireRange && willPeekSoon(target)) {
      const prePos = predictPosition(target, CONFIG.preFireLeadMs) || aimPos;
      if (CONFIG.instantSnapDivisor <= 1.01) instantAimAt(prePos);
      else smoothAimAt(prePos, CONFIG.instantSnapDivisor);
      fireNow();
      return;
    }

    // standard aim: either instant snap or smoothed
    if (CONFIG.instantSnapDivisor = 1.01) {
      instantAimAt(aimPos);
    } else {
      smoothAimAt(aimPos, CONFIG.instantSnapDivisor);
    }

    // burst / spray compensation hook if game exposes it
    try {
      if (CONFIG.burstCompEnabled && typeof game !== 'undefined' && typeof game.autoAdjustSpray === 'function') {
        game.autoAdjustSpray(aimPos, CONFIG.burstCompFactor);
      }
    } catch (e) {}

    // micro corrections
    if (CONFIG.microCorrectionEnabled && typeof game !== 'undefined' && typeof game.microCorrect === 'function') {
      try { game.microCorrect(aimPos); } catch (e) {}
    }

    // try to fire when near target
    attemptAutoFire(target, aimPos);
  }

  /* ============== AIM MOVEMENT HELPERS ============== */
  function instantAimAt(pos) {
    if (!pos) return;
    try {
      setCrosshair({ x: pos.x, y: pos.y });
    } catch (e) {}
  }

  function smoothAimAt(pos, divisor = 3.0) {
    try {
      if (!pos) return;
      const current = crosshairPos();
      const next = {
        x: current.x + (pos.x - current.x) / divisor,
        y: current.y + (pos.y - current.y) / divisor
      };
      setCrosshair(next);
    } catch (e) {}
  }

  /* ============== AUX DETECTION ============== */
  function willPeekSoon(enemy) {
    if (!enemy) return false;
    if (enemy.isAtCoverEdge || enemy.peekIntent) return true;
    const vel = enemy.velocity || { x: 0, y: 0, z: 0 };
    const speed = Math.sqrt((vel.x||0)*(vel.x||0) + (vel.y||0)*(vel.y||0) + (vel.z||0)*(vel.z||0));
    if (speed < 0.15 && (enemy.priorSpeed && enemy.priorSpeed > 0.5)) return true;
    return Math.random() < 0.12; // slightly higher chance
  }

  /* ============== MAIN LOOP ============== */
  function tick() {
    try {
      const enemies = getEnemies();
      if (!enemies || enemies.length === 0) return;
      const target = chooseTarget(enemies);
      if (!target) return;
      engageTarget(target);
    } catch (e) {
      // swallow all errors to avoid breaking host page
      try { console.debug('[AutoHeadlockProMax] tick error', e); } catch (e2) {}
    }
  }

  /* ============== BOOT ============== */
  function init() {
    try {
      // try to wire basic game events if present
      if (window.game && typeof game.on === 'function') {
        try { game.on('playerDamaged', () => { STATE.lastShotAt = now(); STATE.bulletIndex = 0; }); } catch (e) {}
        try { game.on('youWereShot', () => { STATE.lastShotAt = now(); STATE.bulletIndex = 0; }); } catch (e) {}
        try { game.on('weaponFired', () => { STATE.bulletIndex = (STATE.bulletIndex || 0) + 1; }); } catch (e) {}
      }
    } catch (e) {}

    // run main loop
    try {
      setInterval(tick, CONFIG.tickIntervalMs);
    } catch (e) {}
    console.log('[AutoHeadlockProMax v15.0] NoEscape-GodMode FullPower loaded.');
  }

  // Kick off
  init();

})();
