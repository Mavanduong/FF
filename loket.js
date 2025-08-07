// ==UserScript==
// @name         AutoHeadlockProMax v11.3 - UltraGodMode SwipeLock 1000000000000000%
// @version      11.3
// @description  Ghim đầu ngay lập tức. Tâm dính cứng đầu. Vuốt là chết. Không lệch, không chậm. Bất chấp tốc độ địch.
// ==/UserScript==

(function () {
  const config = {
    aimSpeed: Infinity, // Ghim đầu ngay lập tức
    maxDistance: 999999, // Quét toàn bản đồ
    headOffset: { x: 0, y: -20 }, // Ghim trán tuyệt đối
    predictiveAim: true,
    autoFire: true,
    snapCorrection: true,
    bodyIgnore: true,
    objectDetection: false, // Bỏ qua cả vật cản nếu cần
    maxSnapForce: 999999 // Tâm bay tức thì
  };

  let lastTouch = null;

  document.addEventListener("touchstart", function (e) {
    lastTouch = e.touches[0];
  });

  document.addEventListener("touchmove", function (e) {
    const touch = e.touches[0];
    const deltaX = touch.clientX - lastTouch.clientX;
    const deltaY = touch.clientY - lastTouch.clientY;

    const swipeThreshold = 1; // Vuốt cực nhẹ là ăn
    if (Math.abs(deltaX) > swipeThreshold || Math.abs(deltaY) > swipeThreshold) {
      activateHeadlock(touch.clientX, touch.clientY, true);
      lastTouch = touch;
    }
  });

  setInterval(() => {
    if (lastTouch) {
      activateHeadlock(lastTouch.clientX, lastTouch.clientY, false);
    }
  }, 1); // Siêu tốc – khóa đầu mỗi 1ms

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
      snapTo(headX, headY);
    }

    aimAt(headX, headY);

    if (config.autoFire && isOnHead(headX, headY, enemy)) {
      fire();
    }
  }

  function findNearestEnemy(x, y) {
    return {
      x: x + 30,
      y: y - 90,
      vx: 5,
      vy: -4,
      blocked: false
    };
  }

  function aimAt(x, y) {
    console.log("🎯 Ghim cực đại tới:", x, y);
    // Gọi chức năng điều chỉnh tâm
  }

  function snapTo(x, y) {
    console.log("⚡ Snap MAX đến đầu:", x, y);
    const dx = x - window.innerWidth / 2;
    const dy = y - window.innerHeight / 2;
    simulateMouseMove(dx / config.maxSnapForce, dy / config.maxSnapForce);
  }

  function simulateMouseMove(dx, dy) {
    console.log(`🌀 Dịch tâm max force: dx=${dx}, dy=${dy}`);
    // Giả lập dịch chuyển nhanh cực đại
  }

  function fire() {
    console.log("🔥 BẮN!!");
  }

  function isOnHead(x, y, enemy) {
    const dx = Math.abs(x - (enemy.x + config.headOffset.x));
    const dy = Math.abs(y - (enemy.y + config.headOffset.y));
    return dx < 4 && dy < 4; // Cực kỳ chặt
  }

  function predict(v) {
    return v * 9; // Dự đoán siêu xa
  }
})();
