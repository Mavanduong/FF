// ==UserScript==
// @name         AutoHeadlockProMax v14.3-Hybrid
// @version      14.3
// @description  Hybrid: OverReact (instant) + Safe (fake-swipe + AntiBan) auto-switch. Prioritize shooters, head-only clamp close-range.
// @match        *://*/*
// @run-at       document-start
// ==/UserScript==

(() => {
  /* -------------------------
     CONFIG
     ------------------------- */
  const config = {
    // modes
    safeMode: {
      fakeSwipe: true,
      humanDelayRange: [18, 45], // ms
      antiBan: true,
      maxFakeDuration: 120, // ms max swipe simulation
    },
    overReactMode: {
      fakeSwipe: false,
      instantFire: true,
      aggressiveAimPower: 99999999,
      clampForce: 1, // very small divisor for instant move
    },

    // shared
    closeRangeMeters: 8,            // <= this is considered close-range emergency
    instantFireIfHeadLocked: true,  // fire instantly if head is locked in overReact
    dangerHPThreshold: 35,          // if your HP below -> consider dangerous
    dangerRecentShotsWindowMs: 800, // if you've been shot in last window -> danger
    priorityWeights: {              // scoring for target selection
      isShootingYou: 3000,
      distanceFactor: 1.0,
      lowHealthTargetBonus: 250
    },

    tickIntervalMs: 8
  };

  /* -------------------------
     STATE
     ------------------------- */
  let state = {
    mode: 'safe', // 'safe' | 'overreact'
    lastShotAt: 0,
    lastModeSwitchAt: 0,
    session: {
      aimPower: 1e7
    }
  };

  /* -------------------------
     HELPERS (adapter functions - replace if game API differs)
     ------------------------- */
  // NOTE: These adapter functions assume presence of certain game API objects.
  // Replace / adapt getPlayer(), getEnemies(), game.* calls per actual environment.

  function now() { return Date.now(); }

  function getPlayer() {
    return window.player || { x:0,y:0, z:0, hp:100, isAiming:false };
  }

  function getEnemies() {
    return (window.game && game.enemies) ? game.enemies : []; // each enemy must have: head {x,y,z}, position {x,y,z}, health, isAimingAtYou, lastShotAt, isVisible
  }

  function distanceBetween(a, b) {
    const dx = a.x - b.x, dy = a.y - b.y, dz = (a.z||0) - (b.z||0);
    return Math.sqrt(dx*dx + dy*dy + dz*dz);
  }

  /* -------------------------
     ANTI-BAN & FAKE SWIPE
     ------------------------- */
  function rand(min, max) { return Math.random()*(max-min)+min; }

  function simulateFakeSwipe(from, to, durationMs) {
    // Simulate a short human-like swipe: incremental micro-moves over duration
    // If actual game doesn't allow synthetic input, this should emulate by moving crosshair positions
    const steps = Math.max(2, Math.floor(durationMs / 6));
    for (let i=1;i<=steps;i++) {
      const t = i/steps;
      const x = from.x + (to.x - from.x) * t + rand(-0.2,0.2);
      const y = from.y + (to.y - from.y) * t + rand(-0.2,0.2);
      moveCrosshairTo({x,y}, 1 + steps - i); // faster at start, slower to end
    }
  }

  function disableLoggersIfNeeded() {
    try {
      // minimal safe disable if antiBan active
      console._log = console.log;
      if (config.safeMode.antiBan) {
        console.log = () => {};
        console.warn = () => {};
      }
    } catch(e){}
  }

  /* -------------------------
     AIM / FIRE primitives (adapt to engine)
     ------------------------- */
  function moveCrosshairTo(pos, smoothDivisor) {
    // basic move — if game provides direct API use that
    smoothDivisor = smoothDivisor || 6;
    if (window.game && game.crosshair) {
      game.crosshair.x += (pos.x - game.crosshair.x) / smoothDivisor;
      game.crosshair.y += (pos.y - game.crosshair.y) / smoothDivisor;
    } else {
      // fallback no-op or emulate if needed
    }
  }

  function instantAimAtHead(enemy) {
    const head = enemy.getBone ? enemy.getBone('head') : (enemy.head || enemy.position);
    if (!head) return;
    // immediate set
    if (window.game && game.crosshair) {
      game.crosshair.x = head.x;
      game.crosshair.y = head.y;
    } else {
      moveCrosshairTo(head, 1);
    }
  }

  function crosshairIsNearHead(enemy, thresholdPx=6) {
    const head = enemy.getBone ? enemy.getBone('head') : (enemy.head || enemy.position);
    if (!head || !game.crosshair) return false;
    const dx = Math.abs(game.crosshair.x - head.x);
    const dy = Math.abs(game.crosshair.y - head.y);
    return Math.sqrt(dx*dx + dy*dy) <= thresholdPx;
  }

  function fireNow() {
    if (window.game && typeof game.fire === 'function') {
      game.fire();
    } else {
      // fallback: emulate or log
      // console._log('[AutoFire] fired (emulated)');
    }
  }

  /* -------------------------
     TARGET SELECTION
     ------------------------- */
  function scoreTarget(enemy) {
    const player = getPlayer();
    const head = enemy.getBone ? enemy.getBone('head') : (enemy.head || enemy.position);
    const dist = distanceBetween(player, head);
    let score = 0;
    if (enemy.isAimingAtYou) score += config.priorityWeights.isShootingYou;
    score -= dist * config.priorityWeights.distanceFactor;
    if (enemy.health && enemy.health < 30) score += config.priorityWeights.lowHealthTargetBonus;
    return {score, dist};
  }

  function chooseTarget(enemies) {
    let best = null;
    let bestScore = -Infinity;
    for (const e of enemies) {
      if (!e.isVisible || e.health <= 0) continue;
      const s = scoreTarget(e);
      if (s.score > bestScore) { bestScore = s.score; best = {enemy:e, dist:s.dist}; }
    }
    return best ? best.enemy : null;
  }

  /* -------------------------
     DANGER / MODE SWITCHING
     ------------------------- */
  function isInDanger() {
    const player = getPlayer();
    const lowHP = player.hp <= config.dangerHPThreshold;
    const recentShots = (now() - state.lastShotAt) <= config.dangerRecentShotsWindowMs;
    return lowHP || recentShots;
  }

  function updateLastShotIfEnemyShotYou() {
    // If engine signals when you were shot, hook that event and set state.lastShotAt.
    // Fallback: check enemies' lastShotAt properties (if available)
    const enemies = getEnemies();
    for (const e of enemies) {
      if (e.lastShotAt && (now() - e.lastShotAt) < 1200) {
        state.lastShotAt = now();
      }
      if (e.shotYouRecently) state.lastShotAt = now(); // engine-specific
    }
  }

  function switchModeIfNeeded() {
    const danger = isInDanger();
    const prev = state.mode;
    if (danger) {
      state.mode = 'overreact';
    } else {
      state.mode = 'safe';
    }
    if (prev !== state.mode) state.lastModeSwitchAt = now();
  }

  /* -------------------------
     CORE LOOP
     ------------------------- */
  function tick() {
    updateLastShotIfEnemyShotYou();
    switchModeIfNeeded();

    const enemies = getEnemies();
    if (!enemies || enemies.length === 0) return;

    const target = chooseTarget(enemies);
    if (!target) return;

    const head = target.getBone ? target.getBone('head') : (target.head || target.position);
    const player = getPlayer();
    const dist = distanceBetween(player, head);

    // CLOSE-RANGE FORCE HEAD CLAMP: always head-only (avoid body/leg)
    if (dist <= config.closeRangeMeters) {
      // instant head snap in overreact mode or strong clamp in safe mode
      if (state.mode === 'overreact') {
        // instant aim + instant fire for max reaction
        instantAimAtHead(target);
        if (config.overReactMode.instantFire && config.instantFireIfHeadLocked) {
          if (crosshairIsNearHead(target, 8)) fireNow();
        } else if (config.overReactMode.instantFire) {
          fireNow();
        }
        return;
      } else {
        // safe mode: still clamp to head but simulate slight humanized micro-movements then fire quickly
        const headPos = { x: head.x + rand(-0.6,0.6), y: head.y + rand(-0.6,0.6) };
        simulateFakeSwipe(game.crosshair || {x:0,y:0}, headPos, rand(18, 40));
        if (crosshairIsNearHead(target, 10)) fireNow();
        return;
      }
    }

    // NORMAL RANGE BEHAVIOR:
    if (state.mode === 'overreact') {
      // aggressive: minimal smoothing, instant adjust when necessary
      instantAimAtHead(target);
      // auto-adjust for bursts
      if (config.overReactMode.aggressiveAimPower) {
        // optionally apply weapon-specific corrections if available
      }
      // instant fire if near head
      if (crosshairIsNearHead(target, 6)) fireNow();
    } else {
      // SAFE mode: humanized movement + antiBan behaviors
      // Build target pos with prediction
      let predicted = head;
      if (typeof game.predict === 'function') predicted = game.predict(target, head, 1.1);
      const from = game.crosshair || {x: (player.x||0), y: (player.y||0)};
      const duration = Math.min(config.safeMode.maxFakeDuration, rand(...config.safeMode.humanDelayRange));
      simulateFakeSwipe(from, predicted, duration);
      // after simulated swipe, small chance to fire instantly or slightly delayed
      if (crosshairIsNearHead(target, 10)) {
        setTimeout(() => {
          if (Math.random() > 0.12) fireNow();
        }, rand(6, 28));
      }
    }
  }

  /* -------------------------
     BOOT
     ------------------------- */
  function init() {
    disableLoggersIfNeeded();
    // Hook into real "you were shot" event if available:
    if (window.game && typeof game.on === 'function') {
      try {
        game.on('youWereShot', () => { state.lastShotAt = now(); });
        game.on('playerDamaged', () => { state.lastShotAt = now(); });
      } catch(e){}
    }

    // main loop
    setInterval(tick, config.tickIntervalMs);
    console._log && console._log('[AutoHeadlockProMax v14.3] Hybrid loaded. Mode:', state.mode);
  }

  init();

})();
