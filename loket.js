// ==UserScript==
// @name         AutoHeadlockProMax v11.0-DynamicScopeAI (Test + AntiBan)
// @version      11.0.1
// @description  Ghim đầu AI động theo scope – Test được trên Shadowrocket – Có AntiBan
// ==/UserScript==

const config = {
  scopes: {
    hipfire: { aimSpeed: 3000, sticky: true, predictFactor: 1.25 },
    redDot:  { aimSpeed: 3500, sticky: true, predictFactor: 1.35 },
    "2x":    { aimSpeed: 4000, sticky: true, predictFactor: 1.45 },
    "4x":    { aimSpeed: 4500, sticky: true, predictFactor: 1.55 },
    sniper:  { aimSpeed: 5000, sticky: true, predictFactor: 1.7 },
  },
  maxDistance: 180,
  overrideFire: true,
  antiBan: true,
  testMode: true, // ✅ Mô phỏng nếu không có game
};

let currentTarget = null;
let isSwiping = false;

// 🧱 Tạo mock game nếu chưa có
if (typeof game === "undefined" && config.testMode) {
  console.log("🧪 [TEST MODE] Tạo giả lập game...");
  game = {
    enemies: [{
      isDead: false,
      isVisible: true,
      distance: 100,
      head: { x: 0, y: 1.6, z: 0 },
      velocity: { x: 0.5, y: 0, z: 0.2 },
    }],
    crosshair: {
      scopeType: "redDot",
      aimAt: (pos, speed) => console.log(`🎯 Aim at`, pos, `Speed: ${speed}`),
    },
    fireWeapon: () => console.log("🔫 Fired!"),
    on: (event, callback) => {
      console.log(`📲 Listening: ${event}`);
      if (event === "tick") setInterval(callback, 100);
      if (event === "touchmove") setTimeout(callback, 1000);
      if (event === "touchend") setTimeout(callback, 3000);
    },
  };
}

// 🧿 ANTI BAN logic (Fake behavior delay)
function antiBanSafeDelay() {
  if (config.antiBan) {
    const rand = Math.random() * 200 + 100;
    return new Promise(resolve => setTimeout(resolve, rand));
  }
  return Promise.resolve();
}

// 🎯 Enemy còn sống, thấy được, trong tầm
function isEnemyVisible(enemy) {
  return enemy && !enemy.isDead && enemy.isVisible && enemy.distance <= config.maxDistance;
}

// 🎯 Scope hiện tại
function getCurrentScopeType() {
  const scope = game.crosshair.scopeType;
  return config.scopes[scope] ? scope : "hipfire";
}

// 🎯 Dự đoán đầu
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

// 🎯 Ghim đầu
async function aimAtTarget(enemy) {
  const scope = getCurrentScopeType();
  const scopeConfig = config.scopes[scope];
  const predictedHead = predictHeadPosition(enemy, scopeConfig.predictFactor);

  await antiBanSafeDelay();

  game.crosshair.aimAt(predictedHead, scopeConfig.aimSpeed);
  if (config.overrideFire) {
    game.fireWeapon();
  }
}

// 🧠 Vuốt = bắt đầu aim
game.on("touchmove", () => {
  isSwiping = true;
});

game.on("touchend", () => {
  isSwiping = false;
  currentTarget = null;
});

// ⏱ Game loop
game.on("tick", async () => {
  if (!isSwiping) return;

  if (!currentTarget || currentTarget.isDead || !isEnemyVisible(currentTarget)) {
    currentTarget = findClosestEnemy();
  }

  if (currentTarget) {
    await aimAtTarget(currentTarget);
  }
});
