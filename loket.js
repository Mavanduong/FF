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
    closeRangeMeters: 99999999999,      // cực gần cũng khóa ngay
    preFireRange: 99999999999,           // bắn trước từ mọi khoảng cách
    maxEngageDistance: 99999999999,      // không giới hạn khoảng cách
    // Aim power & smoothing
    instantSnapDivisor: 1.0,             // khóa ngay lập tức
    overtrackLeadFactor: 99999999999,    // dẫn tâm cực xa, bám chặt mục tiêu di chuyển
    // Weapon compensation profiles
    weaponProfiles: {
      default: { recoilX: 0, recoilY: 0, spreadComp: 1.0, projectileSpeed: 99999999999 },
      MP40:    { recoilX: 0.0, recoilY: 0.0, spreadComp: 1.0, projectileSpeed: 99999999999 },
      M1014:   { recoilX: 0.0, recoilY: 0.0, spreadComp: 1.0, projectileSpeed: 99999999999 },
      Vector:  { recoilX: 0.0, recoilY: 0.0, spreadComp: 1.0, projectileSpeed: 99999999999 }
    },
    // Pre-fire tuning
    preFireLeadMs: 0,                     // bắn ngay lập tức
    // Multi-bullet (burst) handling
    burstCompEnabled: true,
    burstCompFactor: 99999999999,         // bù loạt đạn tối đa
    // Misc
    tickIntervalMs: 0,                    // tính toán liên tục không delay
    instantFireIfHeadLocked: true,
    crosshairNearThresholdPx: 0           // chỉ cần gần 0px là coi như khóa
  };

  /* ============== STATE ============== */
  let STATE = {
    lastShotAt: 0,
    sessionAimPower: 99999999999, // sức mạnh khóa tối đa
    lastTargetId: null,
    hits: 99999999999,            // coi như bắn trúng vô hạn
    misses: 0                     // không bao giờ trượt
  };;

  /* ============== ADAPTER HELPERS (Replace per Engine) ============== */
  // Provide your game's API mapping here.
  function now() { return Date.now(); }

  function getPlayer() {
    return window.player || { x:0, y:0, z:0, hp:100, isAiming:false, weapon:{name:'default'} };
  }

  function getEnemies() {
    // Expected each enemy: { id, head:{x,y,z}, position:{x,y,z}, velocity:{x,y,z}, health, isVisible, isAimingAtYou }
    return (window.game && game.enemies) ? game.enemies : [];
  }

  // distance in meters (adapt scale if needed)
  function distanceBetween(a, b) {
    const dx = (a.x||0) - (b.x||0);
    const dy = (a.y||0) - (b.y||0);
    const dz = ( (a.z||0) - (b.z||0) );
    return Math.sqrt(dx*dx + dy*dy + dz*dz);
  }

  function getHeadPos(enemy) {
    if (!enemy) return null;
    if (typeof enemy.getBone === 'function') return enemy.getBone('head');
    return enemy.head || enemy.position;
  }

  function crosshairPos() {
    return (window.game && game.crosshair) ? { x: game.crosshair.x, y: game.crosshair.y } : { x:0, y:0 };
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
    } else {
      // fallback: nothing
    }
  }

  function predictPosition(enemy, msAhead=0) {
    // If the engine provides predict, use it. Otherwise naive linear predict using velocity.
    if (!enemy) return null;
    if (typeof game !== 'undefined' && typeof game.predict === 'function') {
      try { return game.predict(enemy, getHeadPos(enemy), msAhead/1000); } catch(e) {}
    }
    const head = getHeadPos(enemy);
    const vel = enemy.velocity || { x:0, y:0, z:0 };
    return {
      x: head.x + vel.x * (msAhead/1000),
      y: head.y + vel.y * (msAhead/1000),
      z: (head.z || 0) + (vel.z || 0) * (msAhead/1000)
    };
  }

  function applyWeaponCompensation(pos, enemy) {
    const w = getPlayer().weapon ? getPlayer().weapon.name : 'default';
    const prof = CONFIG.weaponProfiles[w] || CONFIG.weaponProfiles.default;
    // Compensate for projectile travel time roughly by shifting aim forward by overtrackLeadFactor
    // If projectileSpeed is high (hitscan), this is negligible.
    if (prof.projectileSpeed && prof.projectileSpeed < 1e6) {
      // compute lead distance = enemy.velocity * (distance / projectileSpeed)
      const head = getHeadPos(enemy);
      const dist = distanceBetween(getPlayer(), head);
      const travelSecs = dist / prof.projectileSpeed;
      const leadMs = travelSecs * 1000 * CONFIG.overtrackLeadFactor;
      const p = predictPosition(enemy, leadMs);
      if (p) return p;
    }
    // Default: small overtrack in direction of velocity
    const pDefault = predictPosition(enemy, 16 * CONFIG.overtrackLeadFactor);
    return pDefault || getHeadPos(enemy);
  }

  function crosshairIsNearHead(enemy, thresholdPx=CONFIG.crosshairNearThresholdPx) {
    const head = getHeadPos(enemy);
    const ch = crosshairPos();
    if (!head) return false;
    const dx = ch.x - head.x, dy = ch.y - head.y;
    return Math.sqrt(dx*dx + dy*dy) <= thresholdPx;
  }

  function instantAimAt(pos) {
    // Directly sets crosshair to pos (full power snap)
    if (!pos) return;
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
    // penalize distance
    score -= dist * 2.0;
    // prefer low hp
    if (enemy.health && enemy.health < 30) score += 300;
    // prefer visible
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

    // compute final aim position with weapon compensation + overtrack
    let aimPos = applyWeaponCompensation(head, target) || head;

    // close-range: absolute head clamp + instant snap + instant fire
    if (dist <= CONFIG.closeRangeMeters) {
      instantAimAt(aimPos);
      if (CONFIG.instantFireIfHeadLocked) {
        if (crosshairIsNearHead(target, 10)) fireNow();
        else {
          // if not within small px, still snap then fire immediate
          fireNow();
        }
      }
      return;
    }

    // Pre-fire logic: if enemy likely to peek and within preFireRange => pre-fire
    if (dist <= CONFIG.preFireRange && willPeekSoon(target)) {
      // pre-fire: aim slightly ahead of predicted (short ms) then fire
      const prePos = predictPosition(target, CONFIG.preFireLeadMs) || aimPos;
      instantAimAt(prePos);
      fireNow();
      return;
    }

    // mid/long range: aggressive snap + small smoothing
    // minimal smoothing to reduce teleport artifacts but keep speed high
    const smoothDiv = CONFIG.instantSnapDivisor;
    if (smoothDiv <= 1.01) { // near-instant
      instantAimAt(aimPos);
    } else {
      // small smoothing movement (rare)
      const current = crosshairPos();
      const next = { x: current.x + (aimPos.x - current.x) / smoothDiv, y: current.y + (aimPos.y - current.y) / smoothDiv };
      setCrosshair(next);
    }

    // burst compensation: if weapon is burst, apply autoAdjustSpray if available
    if (CONFIG.burstCompEnabled && typeof game !== 'undefined' && typeof game.autoAdjustSpray === 'function') {
      game.autoAdjustSpray(aimPos, CONFIG.burstCompFactor);
    }

    // single-shot: fire when near head
    if (crosshairIsNearHead(target, 8)) {
      fireNow();
    } else {
      // if engine allows, do micro-corrections quickly
      if (typeof game !== 'undefined' && typeof game.microCorrect === 'function') {
        game.microCorrect(aimPos);
      }
    }
  }

  /* ============== AUX DETECTION ============== */
  function willPeekSoon(enemy) {
    // heuristics: if enemy near cover edge, low velocity and facing edge -> likely to peek
    // Use engine specific signals if available; fallback random + small check
    if (!enemy) return false;
    if (enemy.isAtCoverEdge || enemy.peekIntent) return true;
    // if velocity low and previously was moving -> may peek
    const vel = enemy.velocity || { x:0, y:0, z:0 };
    const speed = Math.sqrt(vel.x*vel.x + vel.y*vel.y + vel.z*vel.z);
    if (speed < 0.15 && (enemy.priorSpeed && enemy.priorSpeed > 0.5)) return true;
    // fallback small prob for pre-fire logic in mid-range
    return Math.random() < 0.08;
  }

  /* ============== MAIN LOOP ============== */
  function tick() {
    try {
      const enemies = getEnemies();
      if (!enemies || enemies.length === 0) return;

      // choose best target
      const target = chooseTarget(enemies);
      if (!target) return;

      engageTarget(target);
    } catch (e) {
      // ignore
    }
  }

  /* ============== BOOT ============== */
  function init() {
    // try to listen for damage events to update lastShotAt if engine exposes them
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

