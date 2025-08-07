// ==UserScript==
// @name         AutoHeadlock v12.0 - AbsoluteHeadOnlyLock
// @version      12.0
// @description  Vuốt là ghim đầu – không lệch – không thân – chính xác tuyệt đối
// ==/UserScript==

const config = {
  scopes: {
    hipfire: { aimSpeed: 3200, predictFactor: 1.2 },
    redDot:  { aimSpeed: 3500, predictFactor: 1.35 },
    "2x":    { aimSpeed: 3800, predictFactor: 1.5 },
    "4x":    { aimSpeed: 4200, predictFactor: 1.65 },
    sniper:  { aimSpeed: 4700, predictFactor: 1.8 },
  },
  maxDistance: 200,
  overrideFire: true,
  snapThreshold: 0.5,  // Nếu lệch khỏi đầu > 0.5m thì snap lại ngay
  antiBan: true,
  testMode: true,
};

let currentTarget = null;
let lastAimPos = null;
let isSwiping = false;

if (typeof game === "undefined" && config.testMode) {
  console.log("🧪 [TEST MODE] Khởi tạo môi trường giả lập...");
  game = {
    enemies: [{
      isDead: false,
      isVisible: true,
      distance: 120,
      head: { x: 0.66, y: 1.65, z: 0.22 },
      velocity: { x: 0.3, y: 0.1, z: -0.15 },
    }],
    crosshair: {
      scopeType: "redDot",
      aimAt: (pos, speed) => console.log("🎯 Aim HEAD at", pos, "Speed:", speed),
    },
    fireWeapon: () => console.log("🔫 Fired!"),
    on: (evt, cb) => {
      if (evt === "tick") setInterval(cb, 100);
      if (evt === "touchmove") setTimeout(cb, 500);
      if (evt === "touchend") setTimeout(cb, 2500);
    },
  };
}

function antiBanDelay() {
  return config.antiBan
    ? new Promise(res => setTimeout(res, Math.random() * 120 + 80))
    : Promise.resolve();
}

function isEnemyVisible(enemy) {
  return enemy && !enemy.isDead && enemy.isVisible && enemy.distance <= config.maxDistance;
}

function getCurrentScopeType() {
  const scope = game.crosshair.scopeType;
  return config.scopes[scope] ? scope : "hipfire";
}

function predictHead(enemy, factor) {
  return {
    x: enemy.head.x + enemy.velocity.x * factor,
    y: enemy.head.y + enemy.velocity.y * factor,
    z: enemy.head.z + enemy.velocity.z * factor,
  };
}

function distance3D(a, b) {
  return Math.sqrt(
    Math.pow(a.x - b.x, 2) +
    Math.pow(a.y - b.y, 2) +
    Math.pow(a.z - b.z, 2)
  );
}

function findNearestEnemy() {
  let minDist = Infinity;
  let best = null;
  for (const e of game.enemies) {
    if (!isEnemyVisible(e)) continue;
    if (e.distance < minDist) {
      minDist = e.distance;
      best = e;
    }
  }
  return best;
}

async function aimHeadOnly(enemy) {
  const scope = getCurrentScopeType();
  const { aimSpeed, predictFactor } = config.scopes[scope];
  const head = predictHead(enemy, predictFactor);

  // Nếu lệch đầu thì snap lại
  if (!lastAimPos || distance3D(lastAimPos, head) > config.snapThreshold) {
    lastAimPos = head;
  }

  await antiBanDelay();
  game.crosshair.aimAt(lastAimPos, aimSpeed);

  if (config.overrideFire) {
    game.fireWeapon();
  }
}

game.on("touchmove", () => {
  isSwiping = true;
});

game.on("touchend", () => {
  isSwiping = false;
  currentTarget = null;
  lastAimPos = null;
});

game.on("tick", async () => {
  if (!isSwiping) return;

  if (!currentTarget || currentTarget.isDead || !isEnemyVisible(currentTarget)) {
    currentTarget = findNearestEnemy();
  }

  if (currentTarget) {
    await aimHeadOnly(currentTarget);
  }
});
