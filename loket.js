// ==UserScript==
// @name         AutoHeadlockProMax v11.2 - DynamicSpeedAim GodSwipe
// @version      11.2
// @description  Ghim đầu siêu tốc độ khi vuốt. Tâm bám đầu AI mạnh. Tự aim, tự bắn, snap cực nhanh, bỏ thân, override chuyển động.
// ==/UserScript==

(function () {
  const config = {
    aimSpeed: 12000,             // Tốc độ aim siêu cao
    maxDistance: 300,
    headOffset: { x: 0, y: -18 },
    predictiveAim: true,
    autoFire: true,
    snapCorrection: true,
    bodyIgnore: true,
    objectDetection: true,
    maxSnapForce: 25             // Lực kéo tâm tức thì
  };

  let lastTouch = null;

  document.addEventListener("touchstart", function (e) {
    lastTouch = e.touches[0];
  });

  document.addEventListener("touchmove", function (e) {
    const touch = e.touches[0];
    const deltaX = touch.clientX - lastTouch.clientX;
    const deltaY = touch.clientY - lastTouch.clientY;

    const swipeThreshold = 3;
    if (Math.abs(deltaX) > swipeThreshold || Math.abs(deltaY) > swipeThreshold) {
      activateHeadlock(touch.clientX, touch.clientY, true);
      lastTouch = touch;
    }
  });

  // Theo dõi và ghim đầu liên tục nếu đang vuốt
  setInterval(() => {
    if (lastTouch) {
      activateHeadlock(lastTouch.clientX, lastTouch.clientY, false);
    }
  }, 8); // tốc độ khóa liên tục cao hơn (8ms)

  function activateHeadlock(x, y, isSwipe) {
    const enemy = findNearestEnemy(x, y);
    if (!enemy || (config.objectDetection && enemy.blocked)) return;

    let headX = enemy.x + config.headOffset.x;
    let headY = enemy.y + config.headOffset.y;

    if (config.predictiveAim) {
      headX += predict(enemy.vx);
      headY += predict(enemy.vy);
    }

    if (config.snapCorrection && isSwipe) {
      snapTo(headX, headY); // di tâm siêu tốc khi vuốt
    }

    aimAt(headX, headY);

    if (config.autoFire && isOnHead(headX, headY, enemy)) {
      fire();
    }
  }

  function findNearestEnemy(x, y) {
    // ⚠️ giả lập enemy – thay bằng API game thực
    return {
      x: x + 25,
      y: y - 85,
      vx: 2.5,
      vy: -1.9,
      blocked: false
    };
  }

  function aimAt(x, y) {
    console.log("🎯 Tâm ghim tới:", x, y);
    // Gọi API ngắm hoặc can thiệp offset chuột/tâm
  }

  function snapTo(x, y) {
    console.log("⚡ Snap nhanh đến đầu:", x, y);
    // Tâm nhảy gắt đến vị trí đầu bằng lực cực mạnh
    // Hook chuột hoặc API game cần force
    const dx = x - window.innerWidth / 2;
    const dy = y - window.innerHeight / 2;
    simulateMouseMove(dx / config.maxSnapForce, dy / config.maxSnapForce);
  }

  function simulateMouseMove(dx, dy) {
    // Giả lập kéo chuột – hook engine riêng
    console.log(`🌀 Dịch chuyển tâm: dx=${dx}, dy=${dy}`);
    // Ở môi trường thực có thể dùng API native hoặc hook offset game
  }

  function fire() {
    console.log("🔥 Auto Fire!");
    // Gọi trigger bắn
  }

  function isOnHead(x, y, enemy) {
    const dx = Math.abs(x - (enemy.x + config.headOffset.x));
    const dy = Math.abs(y - (enemy.y + config.headOffset.y));
    return dx < 6 && dy < 6;
  }

  function predict(v) {
    return v * 6;
  }
})();
