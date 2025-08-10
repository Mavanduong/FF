// ==UserScript==
// @name         AutoHeadlockProMax v17.0 - FullHeadLock Ultimate
// @version      17.0
// @description  Vuốt siêu mượt 100% vào đầu, bắn full mag + xuyên tường, không rời đầu
// @match        *://*/*
// @run-at       document-start
// ==/UserScript==

(() => {
  'use strict';

  const CONFIG = {
    headYOffsetPx: -4,             // Điều chỉnh để chính xác tâm đầu
    tickIntervalMs: 8,             // Khoảng 125 lần/giây đủ mượt và không lag
    smoothingFactor: 0.5,          // Vuốt mượt, 0.5 là vàng, nhanh mà không giật
    fireOnLock: true,
    fullMagDump: true,
    fullMagCountOverride: 30,
    aimThresholdPx: 8,             // Vùng lock nhỏ, đảm bảo bắn đỏ đầu
    extraPenetrationShots: 3       // Bắn xuyên vật thể thêm 3 viên trước khi bắn chính
  };

  let STATE = {
    bursting: false,
    lastEnemyHeads: new Map()
  };

  function getPlayer() {
    return window.player || { x:0, y:0, z:0 };
  }

  function getEnemies() {
    return (window.game && game.enemies) ? game.enemies : [];
  }

  function getHead(enemy) {
    if (!enemy) return null;
    if (typeof enemy.getBone === 'function') {
      try { return enemy.getBone('head'); } catch(e){}
    }
    return enemy.head || enemy.position || null;
  }

  function distance(a,b) {
    const dx = (a.x||0)-(b.x||0),
          dy = (a.y||0)-(b.y||0),
          dz = (a.z||0)-(b.z||0);
    return Math.sqrt(dx*dx + dy*dy + dz*dz);
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

  function shootPenetrationShots() {
    for (let i = 0; i < CONFIG.extraPenetrationShots; i++) {
      fireOnce();
    }
  }

  function aimAtHead(target) {
    const head = getHead(target);
    if (!head) return;

    const aimTarget = { x: head.x, y: head.y + CONFIG.headYOffsetPx };
    const currentCrosshair = (window.game && game.crosshair) ? { x: game.crosshair.x, y: game.crosshair.y } : { x: 0, y: 0 };

    // Tính delta vuốt mượt, không giới hạn clamp để không bị đứng hình khi đang vuốt
    let deltaX = (aimTarget.x - currentCrosshair.x) * CONFIG.smoothingFactor;
    let deltaY = (aimTarget.y - currentCrosshair.y) * CONFIG.smoothingFactor;

    let newX = currentCrosshair.x + deltaX;
    let newY = currentCrosshair.y + deltaY;

    const newAim = { x: newX, y: newY };

    setCrosshair(newAim);

    const dist = Math.hypot(newAim.x - aimTarget.x, newAim.y - aimTarget.y);

    if (CONFIG.fireOnLock && dist <= CONFIG.aimThresholdPx && !STATE.bursting) {
      shootPenetrationShots();
      dumpMag(CONFIG.fullMagCountOverride);
    }
  }

  function chooseTarget(enemies) {
    if (!enemies.length) return null;
    // Chọn kẻ gần nhất, bạn có thể mở rộng thêm ưu tiên đầu to
    const player = getPlayer();
    enemies.sort((a,b) => {
      const headA = getHead(a);
      const headB = getHead(b);
      if (!headA || !headB) return 0;
      return distance(headA, player) - distance(headB, player);
    });
    return enemies[0];
  }

  function tick() {
    const enemies = getEnemies();
    if (!enemies.length) return;
    const target = chooseTarget(enemies);
    if (!target) return;
    aimAtHead(target);
  }

  setInterval(tick, CONFIG.tickIntervalMs);

  window.FullHeadLock = { CONFIG, STATE };

})();
