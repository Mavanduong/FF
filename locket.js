// ==UserScript==
// @name         AutoHeadlockProMax v9.9-GodSwipe999
// @version      9.9
// @description  Vuốt bắn là dính – Ghim đầu kể cả địch nhảy, ngồi, chạy – Bất chấp bật/tắt ngắm
// ==/UserScript==

const config = {
  aimSpeed: 999, // Cực nhanh
  headOffsetY: -0.3, // Dịch lên đầu
  maxDistance: 120, // Khoảng cách tối đa để khóa
  prediction: true,
  predictionFactor: 2, // Dự đoán theo vận tốc
  targetSticky: true, // Giữ mục tiêu
  overrideFire: true,
  lockWhileScoped: true,
  lockWhileHipfire: true,
};

let currentTarget = null;
let isSwiping = false;
let swipeStart = { x: 0, y: 0 };

// Nhận biết động tác vuốt từ người chơi
game.on("touchmove", (touch) => {
  if (!isSwiping) {
    swipeStart = { x: touch.x, y: touch.y };
    isSwiping = true;
  }
});

game.on("touchend", () => {
  isSwiping = false;
  currentTarget = null;
});

function isEnemyVisible(enemy) {
  return enemy && !enemy.isDead && enemy.isVisible && enemy.distance < config.maxDistance;
}

function predictHeadPosition(enemy) {
  const predicted = {
    x: enemy.head.x + enemy.velocity.x * config.predictionFactor,
    y: enemy.head.y + enemy.velocity.y * config.predictionFactor + config.headOffsetY,
    z: enemy.head.z + enemy.velocity.z * config.predictionFactor,
  };
  return predicted;
}

function findClosestEnemy() {
  let closest = null;
  let minDist = Infinity;
  for (const enemy of game.enemies) {
    if (!isEnemyVisible(enemy)) continue;
    const dist = enemy.distance;
    if (dist < minDist) {
      minDist = dist;
      closest = enemy;
    }
  }
  return closest;
}

function aimAtTarget(target) {
  const headPos = predictHeadPosition(target);
  game.crosshair.aimAt(headPos, config.aimSpeed);
  if (config.overrideFire) game.fireWeapon();
}

game.on("tick", () => {
  if (!isSwiping) return;

  if (!currentTarget || currentTarget.isDead || !isEnemyVisible(currentTarget)) {
    currentTarget = findClosestEnemy();
  }

  if (currentTarget) {
    aimAtTarget(currentTarget);
  }
});
