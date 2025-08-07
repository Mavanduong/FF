// ==UserScript==
// @name         GhostAI_SwipeAimTest
// @version      1.0
// @description  Ghim tâm về đầu khi vuốt - để test xem game có nhận script hay không
// ==/UserScript==

const ghostSwipe = {
  aimPower: 2.0, // Hệ số ghim tâm
  aimWhenSwipe: true,
  lockZone: 8.0, // Vuốt vào vùng này thì sẽ aim
};

// Hook tick game
game.on('tick', () => {
  const target = getClosestEnemy();
  if (!target || target.isDead) return;

  const head = target.getHeadPosition();
  const swipe = getSwipeVector();

  // Nếu có vuốt và bật ghim khi vuốt
  if (ghostSwipe.aimWhenSwipe && isSwipeDetected(swipe)) {
    const aimVec = {
      x: head.x * ghostSwipe.aimPower,
      y: head.y * ghostSwipe.aimPower,
    };
    moveCrosshair(aimVec.x, aimVec.y);
    console.log("🧲 Ghim tâm khi vuốt vào:", aimVec);
  }
});

// ========== Fake Game API Dưới Đây (Để Test Trong Môi Trường Không Game) ========== //

function getClosestEnemy() {
  return {
    isDead: false,
    getHeadPosition: () => ({ x: 1.5, y: 1.8 }),
  };
}

function getSwipeVector() {
  // Giả lập người chơi đang vuốt ngang
  return { dx: 1, dy: 0.2 };
}

function isSwipeDetected(vec) {
  const length = Math.sqrt(vec.dx ** 2 + vec.dy ** 2);
  return length > 0.1; // Có vuốt nhẹ là detect
}

function moveCrosshair(dx, dy) {
  console.log(`🎯 Đang kéo tâm: dx=${dx.toFixed(2)}, dy=${dy.toFixed(2)}`);
}
