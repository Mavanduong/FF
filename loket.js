// ==UserScript==
// @name         AutoHeadlockProMax v11.1-FullSmoothFollow
// @version      11.1
// @description  Ghim đầu AI siêu mượt theo từng loại tâm – Vuốt là lock – Có AntiBan và TestMode
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
  testMode: true,
};

let currentTarget = null;
let isSwiping = false;
let lastAimPos = null;

// 🧪 Mock game nếu test
if (typeof game === "undefined" && config.testMode) {
  console.log("🧪 [TEST MODE] Đang tạo giả lập game...");
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

// 🧠 AntiBan Delay
function antiBanSafeDelay() {
  if (config.antiBan) {
    const delay = Math.random() * 200 + 100;
    return new Promise(resolve => setTimeout(resolve, delay));
  }
  return Promise.resolve();
}

// 🎯 Kiểm tra địch
function isEnemyVisible(enemy) {
  return enemy && !enemy.isDead && enemy.isVisible && enemy.distance <= config.maxDistance;
}

// 🎯 Lấy loại scope hiện tại
function getCurrentScopeType() {
  const scope = game.crosshair.scopeType;
  return config.scopes[scope] ? scope : "hipfire";
}

// 🎯 Dự đoán vị trí đầu
function predictHeadPosition(enemy, predictFactor) {
  return {
    x: enemy.head.x + enemy.velocity.x * predictFactor,
    y: enemy.head.y + enemy.velocity.y * predictFactor - 0.35,
    z: enemy.head.z + enemy.velocity.z * predictFactor,
  };
}

// 🧲 Lerp = Mượt
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function smoothMove(from, to, speed) {
  return {
    x: lerp(from.x, to.x, speed),
    y: lerp(from.y, to.y, speed),
    z: lerp(from.z, to.z, speed),
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

// 🎯 Aim mượt vào đầu
async function aimAtTarget(enemy) {
  const scope = getCurrentScopeType();
  const scopeConfig = config.scopes[scope];
  const predictedHead = predictHeadPosition(enemy, scopeConfig.predictFactor);

  if (!lastAimPos) lastAimPos = predictedHead;
  const smoothedPos = smoothMove(lastAimPos, predictedHead, 0.2); // 0.2 là độ mượt
  lastAimPos = smoothedPos;

  await antiBanSafeDelay();

  game.crosshair.aimAt(smoothedPos, scopeConfig.aimSpeed);

  if (config.overrideFire) {
    game.fireWeapon();
  }
}

// 🎮 Vuốt = bắt đầu
game.on("touchmove", () => {
  isSwiping = true;
});

// 🛑 Ngừng vuốt = reset
game.on("touchend", () => {
  isSwiping = false;
  currentTarget = null;
  lastAimPos = null;
});

// 🔁 Tick mỗi 100ms
game.on("tick", async () => {
  if (!isSwiping) return;

  if (!currentTarget || currentTarget.isDead || !isEnemyVisible(currentTarget)) {
    currentTarget = findClosestEnemy();
  }

  if (currentTarget) {
    await aimAtTarget(currentTarget);
  }
});
