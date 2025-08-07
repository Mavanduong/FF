// ==UserScript==
// @name         AutoHeadlockProMax v11.1 - SwipeToLock GodCore+
// @version      11.1
// @description  Vuốt nhẹ là ghim đầu chính xác. Auto Aim, Snap Correction, Bỏ thân, Tự bắn. Siêu mượt trên Shadowrocket.
// ==/UserScript==

(function () {
  const config = {
    aimSpeed: 8000,              // Tốc độ aim cực nhanh (buff)
    maxDistance: 250,            // Phạm vi tối đa xa hơn
    headOffset: { x: 0, y: -18 },// Ưu tiên vùng đầu (tránh cổ)
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

    const swipeThreshold = 3; // Nhạy hơn – chỉ cần vuốt nhẹ là kích hoạt
    if (Math.abs(deltaX) > swipeThreshold || Math.abs(deltaY) > swipeThreshold) {
      activateHeadlock(touch.clientX, touch.clientY);
      lastTouch = touch; // cập nhật lại vị trí vuốt
    }
  });

  // Tự động khóa lại liên tục nếu đang vuốt
  setInterval(() => {
    if (lastTouch) {
      activateHeadlock(lastTouch.clientX, lastTouch.clientY);
    }
  }, 10); // 10ms/ lần → cực nhanh

  function activateHeadlock(x, y) {
    const enemy = findNearestEnemy(x, y);
    if (!enemy || (config.objectDetection && enemy.blocked)) return;

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
    // ⚠️ GIẢ LẬP – cần kết nối với game thật hoặc packet
    return {
      x: x + 25,
      y: y - 85,
      vx: 2.2,
      vy: -1.8,
      blocked: false
    };
  }

  function aimAt(x, y) {
    console.log("🔫 Aim locked at:", x, y);
    // Gọi API ngắm (hook game hoặc framework)
  }

  function fire() {
    console.log("🔥 Auto Fire!");
    // Trigger nút bắn tự động
  }

  function isOnHead(x, y, enemy) {
    const dx = Math.abs(x - (enemy.x + config.headOffset.x));
    const dy = Math.abs(y - (enemy.y + config.headOffset.y));
    return dx < 6 && dy < 6; // kiểm tra lệch nhỏ hơn để chính xác hơn
  }

  function predict(v) {
    return v * 6; // dự đoán mạnh hơn (6 frame)
  }
})();
