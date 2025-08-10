// ==UserScript==
// @name         AutoHeadlockProMax v15.2 - FullHeadLock + ABNR + TargetPriority
// @version      15.2
// @description  100% hút đầu + full mag dump + tăng vùng lock + ưu tiên đầu to + tránh vật cản (ABNR)
// @match        *://*/*
// @run-at       document-start
// ==/UserScript==

(() => {
  'use strict';

const CONFIG = {
  headYOffsetPx: -3.5,
  tickIntervalMs: 5,            // ~200 lần/s, đủ mượt và ổn
  smoothingFactor: 0.25,        // vuốt mượt, 0.1~0.3 là đẹp, ko quá nhanh
  fireOnLock: true,
  fullMagDump: true,
  fullMagCountOverride: 30,     // xả đủ băng, không quá lớn
  aimThresholdPx: 10,           // vùng lock khoảng 10px là đủ để bắn đỏ, ko quá rộng
  maxTargetsConsidered: 20,
};


  let STATE = {
    bursting: false
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

  // Tính headSize ảo, tăng headSize lên để ưu tiên
  function getHeadSize(enemy) {
    return enemy.headSize || 10;  // nếu game ko có thì mặc định 10
  }

  // Kiểm tra có vật cản giữa player và target (line of sight)
  // Bạn cần thay thế bằng API raycast hoặc check vật cản game bạn
  function hasClearLOS(playerPos, targetPos) {
    // MOCK: giả định luôn clear, bạn thay thế
    return true;
  }

  // Chọn target dựa trên ưu tiên:
  // 1. Phải clear line of sight (ABNR)
  // 2. Trong số đó ưu tiên target đầu to
  // 3. Nếu đầu to bằng nhau ưu tiên target gần player
  function chooseTarget(enemies) {
    const player = getPlayer();
    // Lọc target có LOS
    const visibleTargets = enemies.filter(e => {
      const head = getHead(e);
      if (!head) return false;
      return hasClearLOS(player, head);
    });

    if (visibleTargets.length === 0) return null;

    // Tăng headSize ảo lên để ưu tiên
    visibleTargets.forEach(e => {
      e._headSizeBoosted = getHeadSize(e) * 3; // boost 3 lần
    });

    // Sắp xếp target theo headSize giảm dần, nếu bằng nhau thì gần player hơn
    visibleTargets.sort((a,b) => {
      if (b._headSizeBoosted !== a._headSizeBoosted) return b._headSizeBoosted - a._headSizeBoosted;
      return distance(getHead(a), player) - distance(getHead(b), player);
    });

    // Lấy target đầu tiên (ưu tiên nhất)
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

function aimAtHead(target) {
  const head = getHead(target);
  if (!head) return;

  const aimTarget = { x: head.x, y: head.y + CONFIG.headYOffsetPx };
  const currentCrosshair = (window.game && game.crosshair) ? { x: game.crosshair.x, y: game.crosshair.y } : { x: 0, y: 0 };

  // Giới hạn crosshair không vượt quá đầu (theo trục Y)
  let targetY = aimTarget.y;
  if (currentCrosshair.y < aimTarget.y) {
    // Nếu đang dưới đầu, không cho vượt lên trên đầu
    targetY = Math.min(currentCrosshair.y + (aimTarget.y - currentCrosshair.y) * (CONFIG.smoothingFactor || 0.3), aimTarget.y);
  } else {
    // Nếu đang trên đầu rồi, giữ nguyên hoặc kéo nhẹ về đầu
    targetY = Math.max(currentCrosshair.y - (currentCrosshair.y - aimTarget.y) * (CONFIG.smoothingFactor || 0.3), aimTarget.y);
  }

  // Tương tự với trục X nếu cần smoothing (hoặc snap luôn)
  let targetX = aimTarget.x;
  if (CONFIG.smoothingFactor > 0) {
    targetX = currentCrosshair.x + (aimTarget.x - currentCrosshair.x) * CONFIG.smoothingFactor;
  }

  // Đặt lại crosshair với giới hạn
  const newAim = { x: targetX, y: targetY };

  // Tính khoảng cách giữa crosshair mới và đầu mục tiêu
  const dist = Math.hypot(newAim.x - aimTarget.x, newAim.y - aimTarget.y);

  // Chỉ set crosshair nếu khác nhiều để tránh giật mạnh
  if (dist > 0.1) {
    setCrosshair(newAim);
  }

  // Nếu đã gần đủ, bắn
  if (CONFIG.fireOnLock && dist <= CONFIG.aimThresholdPx && !STATE.bursting) {
    const count = CONFIG.fullMagCountOverride;
    if (CONFIG.fullMagDump) dumpMag(count);
    else fireOnce();
  }
}

  function tick() {
    const enemies = getEnemies();
    if (!enemies.length) return;
    const target = chooseTarget(enemies);
    if (!target) return;
    aimAtHead(target);
  }

  setInterval(tick, CONFIG.tickIntervalMs);

  // Xuất config ra ngoài để chỉnh runtime
  window.FullHeadLock = { CONFIG, STATE };

})();
