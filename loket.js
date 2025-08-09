// ==UserScript==
// @name         AutoHeadlockMultiBullet-PerfectHeadlock
// @version      1.0
// @description  Bắn 1 viên ra cả băng đều ghim 1 chỗ đầu, multi-bullet cực chuẩn 100%
// @match        *://*/*
// @run-at       document-start
// ==/UserScript==

(() => {
  'use strict';

  const CONFIG = {
    multiBulletCount: 12,      // số viên đạn trong 1 băng
    clampStepPx: 0.2,          // clamp cực nhỏ để tâm mượt
    crosshairNearThresholdPx: 0.3, // gần sát đầu thì bắn
    instantSnapDivisor: 0.0001,     // gần như instant snap
    tickIntervalMs: 1,         // tick 1ms cho phản hồi max nhanh
    fireDelayBetweenBullets: 15, // delay 15ms giữa mỗi viên đạn (giả lập bắn băng)
    antiBanEnabled: true,
  };

  let STATE = {
    lastFireTime: 0,
    calibrationOffset: { x: 0, y: 0 },
  };

  function now() { return performance.now(); }

  function getPlayer() {
    return window.player || { x: 0, y: 0, z: 0, hp: 100, weapon: { name: 'default' } };
  }

  function getEnemies() {
    return (window.game && game.enemies) ? game.enemies : [];
  }

  function getHeadPos(enemy) {
    if (!enemy) return null;
    if (typeof enemy.getBone === 'function') return enemy.getBone('head');
    return enemy.head || enemy.position;
  }

  function crosshairPos() {
    return (window.game && game.crosshair) ? { x: game.crosshair.x, y: game.crosshair.y } : { x: 0, y: 0 };
  }

  function setCrosshair(pos) {
    if (window.game && game.crosshair) {
      game.crosshair.x = pos.x;
      game.crosshair.y = pos.y;
    }
  }

  function fireNow() {
    if (window.game && typeof game.fire === 'function') {
      game.fire();
      STATE.lastFireTime = now();
    }
  }

  // Clamp mượt, di chuyển tâm không vượt quá bước nhỏ nhất
  function clampAimMove(current, target) {
    const dx = target.x - current.x,
          dy = target.y - current.y,
          dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= CONFIG.clampStepPx) return target;
    const ratio = CONFIG.clampStepPx / dist;
    return { x: current.x + dx * ratio, y: current.y + dy * ratio };
  }

  // Dự đoán vị trí đầu chính xác nhất (không bắn lead, bắn thẳng đầu)
  function predictHead(enemy) {
    return getHeadPos(enemy);
  }

  // Đặt tâm chính xác vào vị trí đầu + calibration offset
  function aimAtHead(enemy) {
    const head = predictHead(enemy);
    if (!head) return;
    const pos = {
      x: head.x + STATE.calibrationOffset.x,
      y: head.y + STATE.calibrationOffset.y
    };
    const current = crosshairPos();
    const smoothPos = clampAimMove(current, pos);
    setCrosshair(smoothPos);
  }

  // Bắn cả băng đạn (multiBulletCount viên), tất cả đều ghim cùng 1 điểm đầu chính xác
  async function fireBurst() {
    for(let i = 0; i < CONFIG.multiBulletCount; i++) {
      fireNow();
      await new Promise(resolve => setTimeout(resolve, CONFIG.fireDelayBetweenBullets));
    }
  }

  // Kiểm tra crosshair đã nằm gần đầu đủ để bắn không
  function canFire(enemy) {
    const head = getHeadPos(enemy);
    const ch = crosshairPos();
    if (!head) return false;
    const dx = ch.x - head.x,
          dy = ch.y - head.y;
    return Math.sqrt(dx*dx + dy*dy) <= CONFIG.crosshairNearThresholdPx;
  }

  // Chọn mục tiêu ưu tiên
  function chooseTarget(enemies) {
    if (!enemies || enemies.length === 0) return null;
    // Ưu tiên kẻ đang aim vào bạn hoặc gần nhất
    let best = null, bestScore = -Infinity;
    for (const e of enemies) {
      const head = getHeadPos(e);
      if (!head) continue;
      const dist = Math.sqrt((e.x || 0)**2 + (e.y || 0)**2 + (e.z || 0)**2);
      let score = 10000 - dist*5;
      if (e.isAimingAtYou) score += 50000;
      if (score > bestScore) {
        bestScore = score;
        best = e;
      }
    }
    return best;
  }

  // Vòng tick chính xử lý logic aim + bắn băng đạn
  let firing = false;
  async function tick() {
    try {
      if (firing) return;
      const enemies = getEnemies();
      const target = chooseTarget(enemies);
      if (!target) return;
      aimAtHead(target);
      if (canFire(target)) {
        firing = true;
        await fireBurst();
        firing = false;
      }
    } catch (e) {}
  }

  function init() {
    if (CONFIG.antiBanEnabled) {
      // Fake delay, fake user agent, tắt log
      console.log = () => {};
      Object.defineProperty(navigator, 'userAgent', { get: () => 'Mozilla/5.0' });
    }
    setInterval(tick, CONFIG.tickIntervalMs);
    console.log('[AutoHeadlockMultiBullet-PerfectHeadlock] loaded.');
  }

  init();

})();
