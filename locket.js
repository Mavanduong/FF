// ==UserScript==
// @name         AutoHeadlockProMax v10.0-GodSwipe999X2
// @version      10.0
// @description  Vuốt = Ghim đầu tuyệt đối – Dự đoán động tác cực chuẩn – Phản ứng cực nhanh
// ==/UserScript==

const config = {
  aimSpeed: 4000, // Gấp đôi tốc độ cũ
  maxDistance: 150, // Xa hơn
  targetSticky: true,
  overrideFire: true,
  lockWhileScoped: true,
  lockWhileHipfire: true,
};

let currentTarget = null;
let isSwiping = false;

// Vuốt tay
game.on("touchmove", (touch) => {
  isSwiping = true;
});

game.on("touchend", () => {
  isSwiping = false;
  currentTarget = null;
});

function isEnemyVisible(enemy) {
  return enemy && !enemy.isDead && enemy.isVisible && enemy.distance < config.maxDistance;
}

// ⚙️ Prediction động dựa theo trạng thái địch
function getPredictionFactor(enemy) {
  if (enemy.isJumping) return 1.75;
  if (enemy.isCrouching) return 1.5;
  if (enemy.getSpeed() > 3.5) return 1.65;
  return 1.35;
}

function predictHeadPosition(enemy) {
  const factor = getPredictionFactor(enemy);
  const predicted = {
    x: enemy.head.x + enemy.velocity.x * factor,
    y: enemy.head.y + enemy.velocity.y * factor - 0.35,
    z: enemy.head.z + enemy.velocity.z * factor,
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

// Tick loop
game.on("tick", () => {
  if (!isSwiping) return;

  if (!currentTarget || currentTarget.isDead || !isEnemyVisible(currentTarget)) {
    currentTarget = findClosestEnemy();
  }

  if (currentTarget) {
    aimAtTarget(currentTarget);
  }
});


