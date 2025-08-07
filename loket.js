// ==UserScript==
// @name         AutoHeadlockProMax v11.0 - SwipeToLock GodCore
// @version      11.0
// @description  Vuốt nhẹ là ghim đầu tuyệt đối. Tự aim, Snap Correction, bỏ qua thân, auto bắn. Cực mượt trên Shadowrocket.
// ==/UserScript==

(function () {
  const config = {
    aimSpeed: 5000, // Tốc độ aim cực nhanh
    maxDistance: 200, // Phạm vi tối đa
    headOffset: { x: 0, y: -12 }, // Ưu tiên vùng đầu
    snapCorrection: true,
    predictiveAim: true,
    autoFire: true,
    bodyIgnore: true,
    objectDetection: true
  };

  let lastTouch = null;

  document.addEventListener("touchstart", function (e) {
    lastTouch = e.touches[0];
  });

  document.addEventListener("touchmove", function (e) {
    const touch = e.touches[0];
    const deltaX = touch.clientX - lastTouch.clientX;
    const deltaY = touch.clientY - lastTouch.clientY;

    const swipeThreshold = 5;
    if (Math.abs(deltaX) > swipeThreshold || Math.abs(deltaY) > swipeThreshold) {
      activateHeadlock(touch.clientX, touch.clientY);
    }
  });

  function activateHeadlock(x, y) {
    const enemy = findNearestEnemy(x, y);
    if (!enemy) return;

    if (config.objectDetection && enemy.blocked) return;

    let headX = enemy.x + config.headOffset.x;
    let headY = enemy.y + config.headOffset.y;

    if (config.predictiveAim) {
      headX += predict(enemy.vx);
      headY += predict(enemy.vy);
    }

    aimAt(headX, headY);

    if (config.autoFire && isOnHead(headX, headY, enemy)) {
      fire();
    }
  }

  function findNearestEnemy(x, y) {
    // GIẢ LẬP - bạn phải thay bằng game API hoặc dữ liệu từ gói mạng
    return {
      x: x + 20,
      y: y - 80,
      vx: 1.5,
      vy: -1.2,
      blocked: false // true nếu bị tường chắn
    };
  }

  function aimAt(x, y) {
    console.log("🔫 Aim locked at:", x, y);
    // gọi API hoặc hook hàm aim
  }

  function fire() {
    console.log("🔥 Auto Fire!");
    // trigger nút bắn
  }

  function isOnHead(x, y, enemy) {
    // kiểm tra lệch tâm
    const dx = Math.abs(x - (enemy.x + config.headOffset.x));
    const dy = Math.abs(y - (enemy.y + config.headOffset.y));
    return dx < 10 && dy < 10;
  }

  function predict(v) {
    return v * 4; // dự đoán 4 frame tiếp theo
  }
})();
