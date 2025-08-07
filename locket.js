// ==UserScript==
// @name         GhostAI_SilentAimStrong
// @version      2.0
// @description  Ghim tâm mạnh không console – phản ứng ngay khi có enemy API
// ==/UserScript==

const GhostAI = {
  autoAimOnSwipe: true,
  aimForce: 12.5,     // Ghim cực nhanh & mạnh
  lockZone: 15.0,     // Vùng aim rộng
  headTrack: true,
};

// Tick mỗi frame
game.on('tick', () => {
  const enemy = getTargetEnemy();
  if (!enemy || enemy.isDead) return;

  if (!GhostAI.autoAimOnSwipe) return;

  const swipe = getSwipeVector();
  if (!isSwipeDetected(swipe)) return;

  const head = enemy.getPredictedHeadPosition();
  const crosshair = getCrosshairPosition();

  const dx = (head.x - crosshair.x) * GhostAI.aimForce;
  const dy = (head.y - crosshair.y) * GhostAI.aimForce;

  if (isWithinLockZone(dx, dy)) {
    moveCrosshair(dx, dy);
  }
});

// ======= Fake Game Engine APIs (Bạn cần thay bằng API thật nếu có) =======

function getTargetEnemy() {
  return {
    isDead: false,
    getPredictedHeadPosition: () => ({ x: 3.2, y: 1.75 }),
  };
}

function getSwipeVector() {
  return { dx: 1.2, dy: 0.4 }; // Thay bằng swipe thật
}

function isSwipeDetected(v) {
  return Math.abs(v.dx) + Math.abs(v.dy) > 0.2;
}

function getCrosshairPosition() {
  return { x: 0, y: 0 };
}

function moveCrosshair(dx, dy) {
  // Không log gì – ghim thầm lặng
}

function isWithinLockZone(dx, dy) {
  return Math.abs(dx) + Math.abs(dy) < GhostAI.lockZone;
}
