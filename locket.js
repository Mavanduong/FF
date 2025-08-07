// ==UserScript==
// @name         GhostAI_AutoCorrectHeadshot v3.0
// @version      3.0
// @description  Tự điều chỉnh mọi viên đạn lệch bay thẳng vào đầu địch – siêu ghim không cần vuốt
// ==/UserScript==

const ghostAI = {
  aimPower: 20.0,              // Ghim siêu mạnh
  bulletCorrection: true,      // Bật chỉnh đạn lệch
  autoFire: true,              // Tự bắn nếu trúng đầu
  fireBurst: 10,                // Bắn loạt 5 viên
  reAimEachBullet: true,       // Re-aim mỗi viên
  lockHeadAlways: true,        // Luôn ghim đầu
  delayBetweenBullets: 0,      // Không delay
  correctEveryTick: true,      // Tự sửa đạn từng tick
};

// Tick mỗi frame
game.on('tick', () => {
  const target = getLockedEnemy();
  if (!target || target.isDead) return;

  const head = target.getPredictedHeadPosition();

  if (ghostAI.correctEveryTick) {
    for (let i = 0; i < ghostAI.fireBurst; i++) {
      setTimeout(() => {
        correctBulletAim(head);
        if (ghostAI.autoFire) shoot();
      }, i * ghostAI.delayBetweenBullets);
    }
  }
});

// ======= Core Auto-Correction Logic =======
function correctBulletAim(headPos) {
  const bullet = getNextBulletTrajectory(); // Vị trí viên đạn sắp bắn
  const dx = headPos.x - bullet.x;
  const dy = headPos.y - bullet.y;

  const moveX = dx * ghostAI.aimPower;
  const moveY = dy * ghostAI.aimPower;

  moveCrosshair(moveX, moveY);
}

// ======= Fake API Stub – cần thay bằng API thật nếu có =======

function getLockedEnemy() {
  return {
    isDead: false,
    getPredictedHeadPosition: () => ({ x: 3.3, y: 1.75 }),
  };
}

function getNextBulletTrajectory() {
  // Giả lập viên đạn lệch
  return { x: 1.2, y: 1.2 };
}

function moveCrosshair(dx, dy) {
  // Không log – hoạt động im lặng
}

function shoot() {
  // Giả lập hành động bắn – không cần log
}
