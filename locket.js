// ==UserScript==
// @name         GhostAI_QuantumLock v100.9-GigaBurst_Overload
// @version      100.9
// @description  Ghim đầu liên tục – burst toàn băng – delay 0ms – bất chấp ping cao – lock max lực cực nhanh
// ==/UserScript==

const ghostAI = {
  aimPower: Infinity,
  lockDistance: 100,
  swipeFixFactor: 2.5, // mạnh hơn để kéo nhanh hơn cả lag
  maxCorrectionSpeed: Infinity,
  fireBurst: 30, // bắn full băng
  aimZone: {
    neckIfNear: false, // bỏ ghim cổ – luôn ghim đầu
    headIfFar: true,
    headZoneRadius: 0.2 // cực nhỏ – chuẩn đầu
  },
  prediction: {
    enabled: true,
    leadTime: 0.16, // dự đoán mạnh hơn
    adjustRate: 1.0 // chính xác tuyệt đối
  },
  autoFire: true,
  autoKillChain: true,
  antiBan: {
    enabled: true,
    layer: 3,
    randomizePath: true,
    simulateHuman: true
  },

  onTick(enemy, aim, fire) {
    if (!enemy.headPos) return;

    // Luôn lock đầu – không cần kiểm tra gần/xa
    const target = predictHead(enemy, this.prediction);

    // Ghim nhanh tuyệt đối
    const correctedAim = instantLock(aim, target);
    lockAim(correctedAim);

    // Bắn khi đang cực gần vùng đầu
    if (this.autoFire && isLockedOnTarget(correctedAim, target, this.aimZone.headZoneRadius)) {
      fire(this.fireBurst); // bắn nguyên băng
    }
  }
};

function getDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function predictHead(enemy, config) {
  return {
    x: enemy.headPos.x + enemy.vel.x * config.leadTime,
    y: enemy.headPos.y + enemy.vel.y * config.leadTime
  };
}

// Lock ngay lập tức – không nội suy – max ping vẫn ghim
function instantLock(current, target) {
  return { x: target.x, y: target.y };
}

function isLockedOnTarget(aim, target, radius) {
  return getDistance(aim, target) <= radius;
}

function lockAim(pos) {
  game.setAim(pos.x, pos.y);
}

game.on('tick', () => {
  const enemy = game.findNearestEnemy();
  if (enemy) ghostAI.onTick(enemy, game.getAim(), game.fire);
});
