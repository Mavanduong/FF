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
    tickIntervalMs: 0.0001,
    aimLockStrength: 9999000000000,
    smoothingFactor: 0.000,
    fireOnLock: true,
    fullMagDump: true,
    fullMagCountOverride: 30,
    aimThresholdPx: 99999,           // Vùng lock đầu rộng hơn (px)
    maxTargetsConsidered: 1000000,     // Số target để xét ưu tiên
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

    const aimPos = { x: head.x, y: head.y + CONFIG.headYOffsetPx };

    // Lock vùng rộng hơn (cho phép lệch một chút)
    const currentCrosshair = (window.game && game.crosshair) ? { x: game.crosshair.x, y: game.crosshair.y } : {x:0,y:0};
    const dist = Math.hypot(aimPos.x - currentCrosshair.x, aimPos.y - currentCrosshair.y);

    if (dist > CONFIG.aimThresholdPx) {
      setCrosshair(aimPos);
    }

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
