// ==UserScript==
// @name         AutoHeadlockProMax v4.3-GodSwipe
// @version      4.3
// @description  Vuốt nhẹ/mạnh đều ghim đầu - Tự chỉnh về đầu khi lệch - Lock đến chết
// ==/UserScript==

console.log("🎯 AutoHeadlockProMax v4.3-GodSwipe ACTIVATED");

const HEAD_OFFSET = { x: 0, y: -0.25 };  // vị trí đầu so với tâm địch
const MAX_HEAD_DISTANCE = 0.5;          // sai số tối đa được phép khi ghim đầu
const ADJUST_SPEED = 0.15;              // tốc độ kéo lại khi lệch
const LOCK_DURATION = 9999;             // thời gian khóa đầu tối đa

let isLocking = false;

game.on('tick', () => {
  const target = game.getClosestEnemy();
  if (!target || !target.isVisible) return;

  const headPos = {
    x: target.position.x + HEAD_OFFSET.x,
    y: target.position.y + HEAD_OFFSET.y
  };

  const currentAim = game.getCrosshairPosition();
  const distToHead = Math.hypot(currentAim.x - headPos.x, currentAim.y - headPos.y);

  // Kiểm tra nếu người chơi vuốt (tâm thay đổi)
  if (game.input.isSwiping) {
    const swipeVector = game.input.getSwipeVector();

    // Nếu đang vuốt về hướng địch → auto ghim đầu
    if (game.vector.isTowards(swipeVector, target.position, game.player.position)) {
      isLocking = true;
    }

    // Nếu vuốt lệch mà vẫn gần đầu → sửa nhẹ về
    if (distToHead < MAX_HEAD_DISTANCE && distToHead > 0.05) {
      const adjust = game.vector.scale(
        game.vector.normalize(game.vector.diff(headPos, currentAim)),
        ADJUST_SPEED
      );
      game.aim.move(adjust);
    }

    // Nếu gần đầu < 0.05 → giữ nguyên
    if (distToHead <= 0.05) {
      game.aim.lock(headPos, LOCK_DURATION);
    }
  }

  // Nếu đã khóa → tiếp tục kéo theo nếu địch di chuyển
  if (isLocking) {
    game.aim.lock(headPos, LOCK_DURATION);
  }

  // Auto tắt khi địch chết hoặc out tầm
  if (target.isDead || !target.isVisible || distToHead > 2) {
    isLocking = false;
    game.aim.unlock();
  }
});
