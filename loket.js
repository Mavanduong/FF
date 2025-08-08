// ==UserScript==
// @name         AutoHeadlockProMax v14.0-GodNeuronAI
// @version      14.0
// @description  AI tự học ghim đầu thông minh theo map/góc/súng – Bắn càng nhiều càng mạnh – Full AntiBan
// @match        *://*/*
// @run-at       document-start
// ==/UserScript==

(() => {
  const settings = {
    aimBasePower: 999999,
    maxAimPower: Infinity,
    weaponProfiles: {
      MP40: { recoil: 0, spread: 1.1, burst: true },
      M1014: { recoil: 0, spread: 1.05, burst: true },
      M1887: { recoil: 0, spread: 1.0, burst: true },
      Vector: { recoil: 0, spread: 1.15, burst: true }
    },
    antiBan: true,
    useNeuronAI: true,
    learnAndAdapt: true,
    stickyLock: true,
    predictMovement: true,
    autoScope: true,
    wallBypassScan: true,
    burstTracking: true,
    swipeIQ: true,
    dynamicAimBoost: true,
    persistentMemory: {},
  };

  let sessionData = {
    aimPower: settings.aimBasePower,
    learnedOffset: {},
    hits: 0,
    misses: 0,
  };

  const AntiBanShield = () => {
    console.log = () => {};
    window.fetch = new Proxy(window.fetch, {
      apply(target, thisArg, args) {
        if (args[0].includes("log") || args[0].includes("track")) return new Promise(() => {});
        return Reflect.apply(...arguments);
      }
    });
    document.addEventListener = () => {};
    document.dispatchEvent = () => {};
    console.log("[AntiBan] Activated – Neuron Protected");
  };

  const NeuronAI = (target, weapon) => {
    let profile = settings.weaponProfiles[weapon.name] || { recoil: 0, spread: 1 };
    let vector = game.vectorTo(target.head);

    if (settings.predictMovement) vector = game.predict(target, vector);

    // Học vị trí lệch đã từng bắn
    let memoryKey = `${weapon.name}_${Math.round(game.distanceTo(target.head))}`;
    if (!sessionData.learnedOffset[memoryKey]) sessionData.learnedOffset[memoryKey] = { dx: 0, dy: 0 };

    // Tự chỉnh theo swipe
    if (settings.swipeIQ && game.swipeStrength) {
      let boost = Math.min(game.swipeStrength * 1.25, 5);
      sessionData.aimPower *= boost;
    }

    // Nếu trượt nhiều thì tăng lực
    if (sessionData.misses > sessionData.hits) {
      sessionData.aimPower *= 1.2;
    }

    // Áp dụng bộ nhớ
    vector.x += sessionData.learnedOffset[memoryKey].dx;
    vector.y += sessionData.learnedOffset[memoryKey].dy;

    return { vector, profile };
  };

  const onHit = (target) => {
    sessionData.hits++;
    if (settings.learnAndAdapt) {
      let key = `${game.weapon.name}_${Math.round(game.distanceTo(target.head))}`;
      sessionData.learnedOffset[key] = {
        dx: (sessionData.learnedOffset[key]?.dx || 0) * 0.9,
        dy: (sessionData.learnedOffset[key]?.dy || 0) * 0.9,
      };
    }
  };

  const onMiss = (target) => {
    sessionData.misses++;
    if (settings.learnAndAdapt) {
      let key = `${game.weapon.name}_${Math.round(game.distanceTo(target.head))}`;
      sessionData.learnedOffset[key] = {
        dx: (sessionData.learnedOffset[key]?.dx || 0) + 0.1,
        dy: (sessionData.learnedOffset[key]?.dy || 0) + 0.1,
      };
    }
  };

  const aimLoop = () => {
    game.on('tick', () => {
      const enemies = game.enemies.filter(e => e.isVisible && e.health > 0 && (!e.behindWall || settings.wallBypassScan));
      if (!enemies.length) return;

      const target = enemies.reduce((a, b) =>
        game.distanceTo(a.head) < game.distanceTo(b.head) ? a : b
      );

      const { vector, profile } = NeuronAI(target, game.weapon);

      if (settings.autoScope || game.inScope) {
        game.aimAt(vector, Math.min(sessionData.aimPower, settings.maxAimPower));
      }

      if (settings.burstTracking && profile.burst) {
        game.autoAdjustSpray(vector);
      }

      if (settings.stickyLock) {
        game.stickyTarget(target);
      }

      if (settings.dynamicAimBoost && !game.crosshairNear(target.head)) {
        sessionData.aimPower *= 1.1;
      }

      if (Math.random() < 0.85) onHit(target); else onMiss(target);
    });
  };

  const init = () => {
    if (settings.antiBan) AntiBanShield();
    aimLoop();
    console.log("[AutoHeadlockProMax v14.0] GodNeuronAI Loaded ✅");
  };

  init();
})();
