// ==UserScript==
// @name         AutoHeadlockProMax v18.0 - DeathTouch Mode
// @version      18.0
// @description  Vuốt gần auto chết, bắn full mag cực nhanh, no recoil, no spread, ưu tiên đầu tuyệt đối
// @match        *://*/*
// @run-at       document-start
// ==/UserScript==

(() => {
  'use strict';

  const CONFIG = {
    headYOffsetPx: -4,
    tickIntervalMs: 2,            // tick ~500 lần/s
    smoothingFactor: 0.99,        // gần như snap tức thì, nhưng để vuốt gần như auto trúng
    fireOnLock: true,
    fullMagDump: true,
    fullMagCountOverride: 40,     // xả 40 viên mỗi lần
    aimThresholdPx: 20,           // vùng lock rộng để không bỏ lỡ bắn
    extraPenetrationShots: 3,     // 3 viên xuyên tường trước khi bắn
  };

  let STATE = {
    bursting: false,
  };

  function getPlayer() {
    return window.player || { x:0,y:0,z:0, weapon:{name:'default'} };
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

  // Luôn chọn target đầu to gần nhất
  function chooseTarget(enemies) {
    const player = getPlayer();

    const filtered = enemies.filter(e => getHead(e) !== null);
    if (filtered.length === 0) return null;

    filtered.forEach(e => {
      e._headSizeBoosted = (e.headSize || 10) * 3;
    });

    filtered.sort((a,b) => {
      if (b._headSizeBoosted !== a._headSizeBoosted) return b._headSizeBoosted - a._headSizeBoosted;
      return distance(getHead(a), player) - distance(getHead(b), player);
    });

    return filtered[0];
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
        // Xóa recoil, spread, cooldown để bắn liên tục và chính xác
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

  // Bắn 3 viên xuyên vật thể trước
  function shootPenetrationShots() {
    for(let i=0; i < CONFIG.extraPenetrationShots; i++) {
      fireOnce();
    }
  }

  function aimAtHead(target) {
    const head = getHead(target);
    if (!head) return;

    const aimTarget = { x: head.x, y: head.y + CONFIG.headYOffsetPx };
    const current = (window.game && game.crosshair) ? { x: game.crosshair.x, y: game.crosshair.y } : { x:0, y:0 };

    // Vuốt cực nhanh, gần như snap
    let deltaX = (aimTarget.x - current.x) * CONFIG.smoothingFactor;
    let deltaY = (aimTarget.y - current.y) * CONFIG.smoothingFactor;

    // Giới hạn không vượt quá điểm target
    let newX = current.x + deltaX;
    let newY = current.y + deltaY;

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
    if (enemies.length === 0) return;

    const target = chooseTarget(enemies);
    if (!target) return;

    aimAtHead(target);
  }

  setInterval(tick, CONFIG.tickIntervalMs);

  window.FullHeadLock = { CONFIG, STATE };

})();
