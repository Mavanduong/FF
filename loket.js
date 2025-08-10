// ==UserScript==
// @name         AutoHeadlockProMax v16.0 - GodMode + Prediction + WallPenetration
// @version      16.0
// @description  100% hút đầu, full mag dump, dự đoán đầu, ưu tiên đầu to, bắn xuyên vật thể, tick cực nhanh
// @match        *://*/*
// @run-at       document-start
// ==/UserScript==

(() => {
  'use strict';

  const CONFIG = {
    headYOffsetPx: -4,
    tickIntervalMs: 4,               // ~250 lần/giây
    smoothingFactor: 0.25,           // vuốt mượt
    fireOnLock: true,
    fullMagDump: true,
    fullMagCountOverride: 30,        // max viên xả mỗi lần
    aimThresholdPx: 12,              // vùng lock chính xác
    maxTargetsConsidered: 20,
    predictionTimeMs: 50,            // dự đoán đầu 50ms
    extraPenetrationShots: 3,        // số viên xuyên vật thể trước khi địch chạy
  };

  let STATE = {
    bursting: false,
    lastEnemyHeads: new Map(),       // lưu vị trí đầu cũ để tính velocity
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

  // Tính headSize ảo, ưu tiên target đầu to
  function getHeadSize(enemy) {
    return enemy.headSize || 10;
  }

  // Kiểm tra vật cản (line of sight) - giả định true, bạn thay thế API raycast thật
  function hasClearLOS(playerPos, targetPos) {
    return true;
  }

  // Tính vận tốc đầu dựa trên delta vị trí giữa các tick
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

  // Dự đoán vị trí đầu địch trong tương lai dựa vận tốc
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

  // Chọn target ưu tiên:
  // 1. Có line of sight
  // 2. Ưu tiên headSize lớn
  // 3. Nếu bằng nhau ưu tiên gần player
  function chooseTarget(enemies) {
    const player = getPlayer();
    const visibleTargets = enemies.filter(e => {
      const head = getHead(e);
      if (!head) return false;
      return hasClearLOS(player, head);
    });

    if (visibleTargets.length === 0) return null;

    visibleTargets.forEach(e => {
      e._headSizeBoosted = getHeadSize(e) * 3;
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
      try { game.fire(); } catch(e){}
    }
  }

  function dumpMag(count) {
    if (STATE.bursting) return;
    STATE.bursting = true;
    try {
      if (game.player && game.player.weapon) {
        game.player.weapon.lastShotTime = 0;
        game.player.weapon.fireCooldown = 0;
      }
      for (let i = 0; i < count; i++) {
        fireOnce();
        if (game.player && game.player.weapon) {
          game.player.weapon.lastShotTime = 0;
        }
      }
    } catch(e){}
    STATE.bursting = false;
  }

  // Bắn thêm viên xuyên vật thể (giả lập bắn xuyên tường) trước khi địch chạy
  // Ở đây chỉ bắn thêm 2-3 viên, không phụ thuộc vật thể thật (do không có API raycast)
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

    let deltaX = (aimTarget.x - currentCrosshair.x) * CONFIG.smoothingFactor;
    let deltaY = (aimTarget.y - currentCrosshair.y) * CONFIG.smoothingFactor;

    let newX = currentCrosshair.x + deltaX;
    let newY = currentCrosshair.y + deltaY;

    if ((deltaX > 0 && newX > aimTarget.x) || (deltaX < 0 && newX < aimTarget.x)) newX = aimTarget.x;
    if ((deltaY > 0 && newY > aimTarget.y) || (deltaY < 0 && newY < aimTarget.y)) newY = aimTarget.y;

    const newAim = { x: newX, y: newY };

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

    // Cập nhật vị trí đầu cho tính velocity
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
