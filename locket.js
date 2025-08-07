// ==UserScript==
// @name         AutoHeadlockProMax v10.0-GodSwipe999X2
// @version      10.0
// @description  Vuốt = Ghim đầu tuyệt đối – Dự đoán động tác cực chuẩn – Phản ứng cực nhanh
// ==/UserScript==

const config = {
  aimSpeed: 4000,             // Tốc độ aim cực nhanh
  maxDistance: 150,           // Khoảng cách tối đa
  targetSticky: true,         // Dính mục tiêu
  overrideFire: true,         // Tự bắn
  lockWhileScoped: true,      // Lock khi bật ngắm
  lockWhileHipfire: true,     // Lock khi bắn không ngắm
};

let currentTarget = null;
let isSwiping = false;

// 🎯 Kiểm tra enemy còn sống và thấy được
function isEnemyVisible(enemy) {
  return enemy && !enemy.isDead && enemy.isVisible && enemy.distance <= config.maxDistance;
}

// 🎯 Dự đoán đầu địch dựa theo chuyển động
function getPredictionFactor(enemy) {
  if (enemy.isJumping) return 1.75;
  if (enemy.isCrouching) return 1.5;
  if (enemy.getSpeed && enemy.getSpeed() > 3.5) return 1.65;
  return 1.35;
}

function predictHeadPosition(enemy) {
  const factor = getPredictionFactor(enemy);
  return {
    x: enemy.head.x + enemy.velocity.x * factor,
    y: enemy.head.y + enemy.velocity.y * factor - 0.35,
    z: enemy.head.z + enemy.velocity.z * factor,
  };
}

// 🎯 Tìm địch gần nhất
function findClosestEnemy() {
  let closest = null;
  let minDist = Infinity;

  for (const enemy of game.enemies) {
    if (!isEnemyVisible(enemy)) continue;
    if (enemy.distance < minDist) {
      minDist = enemy.distance;
      closest = enemy;
    }
  }

  return closest;
}

// 🎯 Ghim đầu
function aimAtTarget(enemy) {
  const predictedHead = predictHeadPosition(enemy);
  game.crosshair.aimAt(predictedHead, config.aimSpeed);

  if (config.overrideFire) {
    game.fireWeapon();
  }
}

// 🧠 Vuốt = Aim
game.on("touchmove", () => {
  isSwiping = true;
});

game.on("touchend", () => {
  isSwiping = false;
  currentTarget = null;
});

// ⏱ Tick game loop
game.on("tick", () => {
  if (!isSwiping) return;

  if (!currentTarget || currentTarget.isDead || !isEnemyVisible(currentTarget)) {
    currentTarget = findClosestEnemy();
  }

  if (currentTarget) {
    aimAtTarget(currentTarget);
  }
});
