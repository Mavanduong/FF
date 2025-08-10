// ==UserScript==
// @name         AutoHeadlockProMax v16.5 - Overkill Test Mode
// @version      16.5
// @description  Test mode: tick siêu nhanh, snap cực mạnh, full mag dump cực lớn, reset recoil triệt để
// @match        *://*/*
// @run-at       document-start
// ==/UserScript==

(() => {
  'use strict';

  const CONFIG = {
    headYOffsetPx: -4,
    tickIntervalMs: 1,           // tick gần như realtime (1000 lần/giây)
    smoothingFactor: 1.0,        // snap tức thì
    fireOnLock: true,
    fullMagDump: true,
    fullMagCountOverride: 10000, // xả full cực lớn
    aimThresholdPx: 3,           // cực kỳ chính xác mới bắn
    maxTargetsConsidered: 50,
    predictionTimeMs: 50,        // dự đoán đầu 50ms
    extraPenetrationShots: 5,    // bắn xuyên vật thể nhiều viên hơn
  };

  let STATE = {
    bursting: false,
    lastEnemyHeads: new Map(),
  };

  function getPlayer() {
    return window.player || { x:0,y:0,z:0, weapon:{name:'default'} };
  }

  function getEnemies() {
    return (window.game && game.enemies) ? game.enemies : [];
  }

  function distance(a,b) {
    const dx = (a.x||0)-(b.x||0),
          dy = (a.y||0)-(b.y||0),
          dz = (a.z||0)-(b.z||0);
    return Math.sqrt(dx*dx + dy*dy + dz*dz);
  }

  function getHead(enemy) {
    if (!enemy) return null;
    if (typeof enemy.getBone === 'function') {
      try { return enemy.getBone('head'); } catch(e){}
    }
    return enemy.head || enemy.position || null;
  }

  function getVelocity(enemy, currentHead) {
    const prev = STATE.lastEnemyHeads.get(enemy);
    if (!prev) return { vx:0, vy:0, vz:0 };

    const dt = CONFIG.tickIntervalMs;
    return {
      vx: (currentHead.x - prev.x) / dt,
      vy: (currentHead.y - prev.y) / dt,
      vz: (currentHead.z - prev.z) / dt,
    };
  }

  function getPredictedHead(enemy) {
    const currentHead = getHead(enemy);
    if (!currentHead) return null;

    const velocity = getVelocity(enemy, currentHead);

    return {
      x: currentHead.x + velocity.vx * CONFIG.predictionTimeMs,
      y: currentHead.y + velocity.vy * CONFIG.predictionTimeMs,
      z: currentHead.z + velocity.vz * CONFIG.predictionTimeMs,
    };
  }

  function hasClearLOS(playerPos, targetPos) {
    return true; // giả định clear, bạn có thể thay bằng raycast
  }

  function chooseTarget(enemies) {
    const player = getPlayer();
    const visibleTargets = enemies.filter(e => {
      const head = getHead(e);
      if (!head) return false;
      return hasClearLOS(player, head);
    });

    if (visibleTargets.length === 0) return null;

    visibleTargets.forEach(e => {
      e._headSizeBoosted = (e.headSize || 10) * 5; // boost lớn hơn nữa
    });

    visibleTargets.sort((a,b) => {
      if (b._headSizeBoosted !== a._headSizeBoosted) return b._headSizeBoosted - a._headSizeBoosted;
      return distance(getHead(a), player) - distance(getHead(b), player);
    });

    return visibleTargets[0];
  }

  function setCrosshair(pos) {
    if (window.game && game.crosshair) {
      game.crosshair.x = pos.x;
      game.crosshair.y = pos.y;
    }
  }

  function fireOnce() {
    if (window.game && typeof game.fire === 'function') {
      try { 
        if (game.player && game.player.weapon) {
          // reset recoil/spread cực mạnh mỗi lần bắn
          game.player.weapon.recoil = 0;
          game.player.weapon.spread = 0;
          game.player.weapon.lastShotTime = 0;
          game.player.weapon.fireCooldown = 0;
        }
        game.fire(); 
      } catch(e){}
    }
  }

  function dumpMag(count) {
    if (STATE.bursting) return;
    STATE.bursting = true;
    try {
      for (let i = 0; i < count; i++) {
        fireOnce();
      }
    } catch(e){}
    STATE.bursting = false;
  }

  function shootPenetrationShots() {
    for (let i = 0; i < CONFIG.extraPenetrationShots; i++) {
      fireOnce();
    }
  }

  function aimAtHead(target) {
    const predictedHead = getPredictedHead(target);
    if (!predictedHead) return;

    const aimTarget = { x: predictedHead.x, y: predictedHead.y + CONFIG.headYOffsetPx };
    const currentCrosshair = (window.game && game.crosshair) ? { x: game.crosshair.x, y: game.crosshair.y } : { x: 0, y: 0 };

    // Không vuốt mà snap luôn tâm vào đầu
    const newAim = { x: aimTarget.x, y: aimTarget.y };
    setCrosshair(newAim);

    const dist = Math.hypot(newAim.x - aimTarget.x, newAim.y - aimTarget.y);

    if (CONFIG.fireOnLock && dist <= CONFIG.aimThresholdPx && !STATE.bursting) {
      shootPenetrationShots();
      dumpMag(CONFIG.fullMagCountOverride);
    }
  }

  function tick() {
    const enemies = getEnemies();
    if (!enemies.length) return;

    enemies.forEach(e => {
      const head = getHead(e);
      if (head) STATE.lastEnemyHeads.set(e, { x: head.x, y: head.y, z: head.z });
    });

    const target = chooseTarget(enemies);
    if (!target) return;

    aimAtHead(target);
  }

  setInterval(tick, CONFIG.tickIntervalMs);

  window.FullHeadLock = { CONFIG, STATE };

})();
