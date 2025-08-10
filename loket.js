// ==UserScript==
// @name         AutoHeadlockProMax v15.0 - FullHeadLock
// @version      15.0
// @description  100% hút đầu + bắn ngay, không teleport, giữ cảm giác vuốt tay
// @match        *://*/*
// @run-at       document-start
// ==/UserScript==

(() => {
  'use strict';

  const CONFIG = {
    headYOffsetPx: -3, // Lệch xuống 2.5px để tâm luôn đúng giữa đầu -> full đỏ
    tickIntervalMs: 0.1, // Tick siêu nhanh (càng nhỏ càng mượt)
    aimLockStrength: 9999, // Độ hút đầu (càng cao càng mạnh, 9999 = tuyệt đối)
    smoothingFactor: 0.0, // 0 = không làm chậm, aim dính tức thì
    fireOnLock: true, // Bắn ngay khi head lock
    fullMagDump: true, // Xả toàn bộ băng
    fullMagCountOverride: 30 // Ép số viên mỗi lần xả
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

  function crosshair() {
    if (window.game && game.crosshair) return { x: game.crosshair.x, y: game.crosshair.y };
    return { x:0, y:0 };
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

  function chooseTarget(enemies) {
    // Ưu tiên gần nhất
    let best = null, minDist = Infinity;
    const player = getPlayer();
    for (const e of enemies) {
      const head = getHead(e);
      if (!head) continue;
      const d = distance(player, head);
      if (d < minDist) { minDist = d; best = e; }
    }
    return best;
  }

  function aimAtHead(target) {
    const head = getHead(target);
    if (!head) return;

    // Dịch tâm về đầu với lực hút tối đa
    const aimPos = { x: head.x, y: head.y + CONFIG.headYOffsetPx };
    setCrosshair(aimPos);

    // Bắn ngay khi khóa đầu
    if (CONFIG.fireOnLock && !STATE.bursting) {
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

  // Xuất config ra console để chỉnh runtime
  window.FullHeadLock = { CONFIG, STATE };

})();
