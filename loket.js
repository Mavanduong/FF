// ==UserScript==
// @name         AutoHeadlockProMax v11.0-DynamicScopeAI
// @version      11.0
// @description  Tự động ghim đầu AI siêu chính xác – Điều chỉnh theo loại tâm – Vuốt là chết
// ==/UserScript==

const config = {
  scopes: {
    hipfire:     { aimSpeed: 3000, sticky: true, predictFactor: 1.25 },
    redDot:      { aimSpeed: 3500, sticky: true, predictFactor: 1.35 },
    2x:          { aimSpeed: 4000, sticky: true, predictFactor: 1.45 },
    4x:          { aimSpeed: 4500, sticky: true, predictFactor: 1.55 },
    sniper:      { aimSpeed: 5000, sticky: true, predictFactor: 1.7 },
  },
  maxDistance: 180,
  overrideFire: true,
};

let currentTarget = null;
let isSwiping = false;

// 🎯 Enemy còn sống, thấy được, trong tầm
function isEnemyVisible(enemy) {
  return enemy && !enemy.isDead && enemy.isVisible && enemy.distance <= config.maxDistance;
}

// 🎯 Xác định loại scope hiện tại
function getCurrentScopeType() {
  const scope = game.crosshair.scopeType;
  return config.scopes[scope] ? scope : "hipfire"; // fallback nếu không rõ
}

// 🎯 Dự đoán đầu dựa theo scope AI
function predictHeadPosition(enemy, predictFactor) {
  return {
    x: enemy.head.x + enemy.velocity.x * predictFactor,
    y: enemy.head.y + enemy.velocity.y * predictFactor - 0.35,
    z: enemy.head.z + enemy.velocity.z * predictFactor,
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

// 🎯 Ghim đầu với AI theo scope
function aimAtTarget(enemy) {
  const scope = getCurrentScopeType();
  const scopeConfig = config.scopes[scope];

  const predictedHead = predictHeadPosition(enemy, scopeConfig.predictFactor);
  game.crosshair.aimAt(predictedHead, scopeConfig.aimSpeed);

  if (config.overrideFire) {
    game.fireWeapon();
  }
}

// 🧠 Vuốt để bắt đầu
game.on("touchmove", () => {
  isSwiping = true;
});

game.on("touchend", () => {
  isSwiping = false;
  currentTarget = null;
});

// ⏱ Tick vòng lặp
game.on("tick", () => {
  if (!isSwiping) return;

  if (!currentTarget || currentTarget.isDead || !isEnemyVisible(currentTarget)) {
    currentTarget = findClosestEnemy();
  }

  if (currentTarget) {
    aimAtTarget(currentTarget);
  }
});
