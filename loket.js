// ==UserScript==
// @name         AutoHeadlockProMax v17.0 - AI Prediction + Smart Aim + Adaptive Smoothing
// @version      17.0
// @description  AI cực mạnh: dự đoán chính xác, quỹ đạo cong, điều chỉnh vuốt theo tốc độ, ưu tiên mục tiêu nguy hiểm, bắn xuyên vật thể thông minh
// @match        *://*/*
// @run-at       document-start
// ==/UserScript==

(() => {
  'use strict';

  const CONFIG = {
    headYOffsetPx: -4,
    tickIntervalMs: 3,                // tick ~333 lần/giây
    baseSmoothingFactor: 0.3,         // smoothing cơ bản
    maxSmoothingFactor: 1.0,          // max snap tức thì
    fireOnLock: true,
    fullMagDump: true,
    fullMagCountOverride: 40,
    aimThresholdPx: 8,                // vùng lock nhỏ
    maxTargetsConsidered: 30,
    predictionTimeMs: 40,             // dự đoán 40ms
    extraPenetrationShots: 3,
    dangerDistanceThreshold: 50,     // ưu tiên địch trong bán kính 50
    dangerWeaponPriority: ['sniper', 'rifle', 'shotgun'], // ưu tiên cầm súng mạnh
  };

  let STATE = {
    bursting: false,
    lastEnemyHeads: new Map(),
    lastEnemyVelocities: new Map(),
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
    const vx = (currentHead.x - prev.x) / dt;
    const vy = (currentHead.y - prev.y) / dt;
    const vz = (currentHead.z - prev.z) / dt;

    // Lọc vận tốc quá lớn (bất thường)
    if (Math.abs(vx) > 5000 || Math.abs(vy) > 5000 || Math.abs(vz) > 5000) return { vx:0, vy:0, vz:0 };

    return { vx, vy, vz };
  }

  // AI Prediction: Dự đoán vị trí đầu dựa vận tốc + gia tốc giả định
  function getPredictedHead(enemy) {
    const currentHead = getHead(enemy);
    if (!currentHead) return null;

    const velocity = getVelocity(enemy, currentHead);
    STATE.lastEnemyVelocities.set(enemy, velocity);

    // Gia tốc giả định (địch thường thay đổi hướng nhẹ)
    const accel = { ax: 0, ay: 0, az: 0 }; // hiện chưa có dữ liệu gia tốc

    const dt = CONFIG.predictionTimeMs;
    return {
      x: currentHead.x + velocity.vx * dt + 0.5 * accel.ax * dt * dt,
      y: currentHead.y + velocity.vy * dt + 0.5 * accel.ay * dt * dt + CONFIG.headYOffsetPx,
      z: currentHead.z + velocity.vz * dt + 0.5 * accel.az * dt * dt,
    };
  }

  // Kiểm tra vật cản (giả lập luôn clear)
  function hasClearLOS(playerPos, targetPos) {
    return true;
  }

  // Tính độ nguy hiểm mục tiêu để ưu tiên:
  // + Địch gần player
  // + Địch cầm súng mạnh
  // + Địch đang hướng súng về player (nếu có dữ liệu)
  function getDangerScore(enemy) {
    const player = getPlayer();
    const dist = distance(getHead(enemy), player);
    let score = 0;

    if (dist < CONFIG.dangerDistanceThreshold) {
      score += 1000 - dist * 10;
    }

    if (enemy.weapon && enemy.weapon.name) {
      for (const w of CONFIG.dangerWeaponPriority) {
        if (enemy.weapon.name.toLowerCase().includes(w)) {
          score += 500;
          break;
        }
      }
    }

    // TODO: nếu có hướng ngắm có thể cộng thêm điểm

    return score;
  }

  // Chọn target ưu tiên
  function chooseTarget(enemies) {
    const player = getPlayer();
    const visibleTargets = enemies.filter(e => {
      const head = getHead(e);
      if (!head) return false;
      return hasClearLOS(player, head);
    });

    if (visibleTargets.length === 0) return null;

    visibleTargets.forEach(e => {
      e._headSizeBoosted = (e.headSize || 10) * 3;
      e._dangerScore = getDangerScore(e);
    });

    visibleTargets.sort((a,b) => {
      // Ưu tiên điểm nguy hiểm cao hơn
      if (b._dangerScore !== a._dangerScore) return b._dangerScore - a._dangerScore;
      // Nếu bằng nhau ưu tiên đầu to hơn
      if (b._headSizeBoosted !== a._headSizeBoosted) return b._headSizeBoosted - a._headSizeBoosted;
      // Cuối cùng ưu tiên gần player hơn
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

  // Tự động điều chỉnh smoothing dựa vào vận tốc địch (nhanh thì snap, chậm thì vuốt mượt)
  function adaptiveSmoothing(velocity) {
    const speed = Math.sqrt(velocity.vx*velocity.vx + velocity.vy*velocity.vy + velocity.vz*velocity.vz);
    // Speed từ 0 đến 2000 => smoothing từ base đến max
    const factor = Math.min(speed / 2000, 1);
    return CONFIG.baseSmoothingFactor + factor * (CONFIG.maxSmoothingFactor - CONFIG.baseSmoothingFactor);
  }

  // Bắn xuyên vật thể thông minh (số viên đạn theo vận tốc và khoảng cách)
  function shootPenetrationShots(velocity, dist) {
    const baseShots = CONFIG.extraPenetrationShots;
    const speed = Math.sqrt(velocity.vx*velocity.vx + velocity.vy*velocity.vy + velocity.vz*velocity.vz);
    const shotCount = Math.min(baseShots + Math.floor(speed / 1000) + Math.floor(dist / 100), 10);

    for (let i = 0; i < shotCount; i++) {
      fireOnce();
    }
  }

  function aimAtHead(target) {
    const predictedHead = getPredictedHead(target);
    if (!predictedHead) return;

    const currentCrosshair = (window.game && game.crosshair) ? { x: game.crosshair.x, y: game.crosshair.y } : { x: 0, y: 0 };

    const velocity = STATE.lastEnemyVelocities.get(target) || { vx:0, vy:0, vz:0 };
    const dist = distance(getHead(target), getPlayer());

    const smoothing = adaptiveSmoothing(velocity);

    let deltaX = (predictedHead.x - currentCrosshair.x) * smoothing;
    let deltaY = (predictedHead.y - currentCrosshair.y) * smoothing;

    // Cập nhật aim mới, giới hạn không vượt quá điểm predicted
    let newX = currentCrosshair.x + deltaX;
    let newY = currentCrosshair.y + deltaY;

    if ((deltaX > 0 && newX > predictedHead.x) || (deltaX < 0 && newX < predictedHead.x)) newX = predictedHead.x;
    if ((deltaY > 0 && newY > predictedHead.y) || (deltaY < 0 && newY < predictedHead.y)) newY = predictedHead.y;

    const newAim = { x: newX, y: newY };

    setCrosshair(newAim);

    const distToAim = Math.hypot(newAim.x - predictedHead.x, newAim.y - predictedHead.y);

    if (CONFIG.fireOnLock && distToAim <= CONFIG.aimThresholdPx && !STATE.bursting) {
      shootPenetrationShots(velocity, dist);
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
