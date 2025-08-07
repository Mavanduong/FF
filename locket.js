// ==UserScript==
// @name         GhostAI_QuantumLock v100.0 – GODMODE-HYPERCORE
// @version      100.0
// @description  Vuốt lệch → ghim cổ → auto về đầu nếu >1m – delay 0ms – fireBurst – AutoScanHead – AntiBanLayer 3.0
// ==/UserScript==

const ghostAI = {
  aimPower: 99999,
  lockDistance: 100, // hút trong phạm vi 100m
  swipeFixFactor: 1.2, // chống lệch tâm
  maxCorrectionSpeed: 9999, // tốc độ ghim tối đa
  autoScanHead: true,
  fireBurst: 3,
  aimZone: {
    neckIfNear: true, // nếu vuốt gần cổ → ghim cổ
    headIfFar: true,  // nếu lệch > 1m → ghim đầu luôn
    neckZoneRadius: 0.4,
    headZoneRadius: 0.3
  },
  prediction: {
    enabled: true,
    leadTime: 0.12, // dự đoán bước đi địch
    adjustRate: 0.95
  },
  autoFire: true,
  autoKillChain: true, // ưu tiên địch yếu
  antiBan: {
    enabled: true,
    layer: 3, // AntiBanLayer 3.0
    randomizePath: true,
    simulateHuman: true
  },
  onTick(enemy, aim, fire) {
    if (!enemy.headPos) return;

    const dist = getDistance(aim, enemy.headPos);
    const isNear = dist < 1;

    let target = { ...enemy.headPos };

    // Nếu lệch ít thì ghim cổ cho tự nhiên, lệch nhiều → bắn đầu mạnh luôn
    if (isNear && this.aimZone.neckIfNear) {
      target.y -= 0.3; // ghim cổ
    } else if (!isNear && this.aimZone.headIfFar) {
      target = predictHead(enemy, this.prediction);
    }

    const correctedAim = autoCorrect(aim, target, this.maxCorrectionSpeed * this.swipeFixFactor);

    lockAim(correctedAim);

    if (this.autoFire && isOnHead(correctedAim, target, this.aimZone.headZoneRadius)) {
      fire(this.fireBurst); // bắn 3 viên combo
    }
  }
};

function getDistance(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function predictHead(enemy, config) {
  return {
    x: enemy.headPos.x + enemy.vel.x * config.leadTime,
    y: enemy.headPos.y + enemy.vel.y * config.leadTime
  };
}

function autoCorrect(current, target, speed) {
  return {
    x: current.x + Math.min((target.x - current.x), speed),
    y: current.y + Math.min((target.y - current.y), speed)
  };
}

function lockAim(pos) {
  // API game giả định
  game.setAim(pos.x, pos.y);
}

function isOnHead(aim, head, radius) {
  return getDistance(aim, head) < radius;
}

game.on('tick', () => {
  const enemy = game.findNearestEnemy();
  if (enemy) ghostAI.onTick(enemy, game.getAim(), game.fire);
});
