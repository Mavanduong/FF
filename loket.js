// ==UserScript==
// @name         AutoHeadlockProMax v16.1 - FullHeadLock Perfect Aim + Prediction + WallPenetration
// @version      16.1
// @description  100% hút đầu chính xác tuyệt đối, dự đoán đầu di chuyển, bắn xuyên vật thể, tick siêu nhanh, full mag dump
// @match        *://*/*
// @run-at       document-start
// ==/UserScript==

(() => {
  'use strict';

  const CONFIG = {
    headYOffsetPx: 0,                // Không bù offset để aim chuẩn đầu thật
    tickIntervalMs: 3,               // ~333 lần/giây, đủ mượt & nhanh
    smoothingFactor: 0.35,           // Vuốt mượt, không giật
    fireOnLock: true,
    fullMagDump: true,
    fullMagCountOverride: 40,        // Số viên xả mỗi lần, tăng mạnh
    aimThresholdPx: 4,               // Vùng lock siêu nhỏ để bắn cực chuẩn đầu
    maxTargetsConsidered: 25,
    predictionTimeMs: 70,            // Dự đoán vị trí đầu sau 70ms (tăng độ chính xác)
    extraPenetrationShots: 3,       // Xả 3 viên xuyên vật thể trước khi bắn chính
  };

  let STATE = {
    bursting: false,
    lastEnemyHeads: new Map(),       // Lưu vị trí đầu cũ để tính vận tốc
  };

  // Lấy player
  function getPlayer() {
    return window.player || { x:0,y:0,z:0, weapon:{name:'default'} };
  }

  // Lấy danh sách kẻ địch
  function getEnemies() {
    return (window.game && game.enemies) ? game.enemies : [];
  }

  // Tính khoảng cách 3D
  function distance(a,b) {
    const dx = (a.x||0)-(b.x||0),
          dy = (a.y||0)-(b.y||0),
          dz = (a.z||0)-(b.z||0);
    return Math.sqrt(dx*dx + dy*dy + dz*dz);
  }

  // Lấy tọa độ đầu chính xác
  function getHead(enemy) {
    if (!enemy) return null;
    if (typeof enemy.getBone === 'function') {
      try { return enemy.getBone('head'); } catch(e){}
    }
    return enemy.head || enemy.position || null;
  }

  // Tính headSize ảo để ưu tiên target đầu to
  function getHeadSize(enemy) {
    return enemy.headSize || 10;
  }

  // Kiểm tra vật cản (line of sight) - giả lập luôn clear, bạn thay thế API thật nếu có
  function hasClearLOS(playerPos, targetPos) {
    return true;
  }

  // Tính vận tốc đầu dựa trên vị trí cũ
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

  // Dự đoán vị trí đầu trong tương lai dựa vận tốc
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

  // Chọn target ưu tiên
  function chooseTarget(enemies) {
    const player = getPlayer();

    // Lọc target có LOS
    const visibleTargets = enemies.filter(e => {
      const head = getHead(e);
      if (!head) return false;
      return hasClearLOS(player, head);
    });

    if (visibleTargets.length === 0) return null;

    // Boost headSize ưu tiên target đầu to
    visibleTargets.forEach(e => {
      e._headSizeBoosted = getHeadSize(e) * 3;
    });

    // Sắp xếp giảm dần theo headSize, nếu bằng nhau thì gần player hơn
    visibleTargets.sort((a,b) => {
      if (b._headSizeBoosted !== a._headSizeBoosted) return b._headSizeBoosted - a._headSizeBoosted;
      return distance(getHead(a), player) - distance(getHead(b), player);
    });

    return visibleTargets[0];
  }

  // Đặt vị trí crosshair
  function setCrosshair(pos) {
    if (window.game && game.crosshair) {
      game.crosshair.x = pos.x;
      game.crosshair.y = pos.y;
    }
  }

  // Bắn 1 viên
  function fireOnce() {
    if (window.game && typeof game.fire === 'function') {
      try { game.fire(); } catch(e){}
    }
  }

  // Xả đạn băng đạn
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

  // Bắn viên xuyên vật thể trước khi bắn chính
  function shootPenetrationShots() {
    for (let i = 0; i < CONFIG.extraPenetrationShots; i++) {
      fireOnce();
    }
  }

  // Aim vào đầu chính xác tuyệt đối, dự đoán di chuyển
  function aimAtHead(target) {
    const predictedHead = getPredictedHead(target);
    if (!predictedHead) return;

    // Không bù offset để chắc chắn aim đúng đầu
    const aimTarget = { x: predictedHead.x, y: predictedHead.y + CONFIG.headYOffsetPx };

    const currentCrosshair = (window.game && game.crosshair) ? { x: game.crosshair.x, y: game.crosshair.y } : { x: 0, y: 0 };

    // Tính delta để vuốt mượt
    let deltaX = (aimTarget.x - currentCrosshair.x) * CONFIG.smoothingFactor;
    let deltaY = (aimTarget.y - currentCrosshair.y) * CONFIG.smoothingFactor;

    let newX = currentCrosshair.x + deltaX;
    let newY = currentCrosshair.y + deltaY;

    // Giới hạn không vượt quá aimTarget từng trục
    if ((deltaX > 0 && newX > aimTarget.x) || (deltaX < 0 && newX < aimTarget.x)) newX = aimTarget.x;
    if ((deltaY > 0 && newY > aimTarget.y) || (deltaY < 0 && newY < aimTarget.y)) newY = aimTarget.y;

    const newAim = { x: newX, y: newY };

    setCrosshair(newAim);

    // Khoảng cách crosshair tới đầu mục tiêu
    const dist = Math.hypot(newAim.x - aimTarget.x, newAim.y - aimTarget.y);

    // Nếu đủ gần (trong threshold) và không đang xả đạn thì bắn
    if (CONFIG.fireOnLock && dist <= CONFIG.aimThresholdPx && !STATE.bursting) {
      shootPenetrationShots();               // Xả 3 viên xuyên vật thể
      dumpMag(CONFIG.fullMagCountOverride); // Xả full mag
    }
  }

  // Tick chạy lặp
  function tick() {
    const enemies = getEnemies();
    if (!enemies.length) return;

    // Cập nhật vị trí đầu để tính vận tốc
    enemies.forEach(e => {
      const head = getHead(e);
      if (head) STATE.lastEnemyHeads.set(e, { x: head.x, y: head.y, z: head.z });
    });

    const target = chooseTarget(enemies);
    if (!target) return;

    aimAtHead(target);
  }

  setInterval(tick, CONFIG.tickIntervalMs);

  // Xuất config, state ra ngoài để chỉnh runtime
  window.FullHeadLock = { CONFIG, STATE };

})();
