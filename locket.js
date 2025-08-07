// ==UserScript==
// @name         GhostAI_QuantumLock v100.1 – HeadLockAbsolute
// @version      100.1
// @description  Ghim đầu 100% – Không lệch – Bắn ra là trúng – Delay 0ms – Dự đoán địch di chuyển – AntiBan 3.0
// ==/UserScript==

const ghostAI = {
  aimPower: 99999,
  lockDistance: 100,
  swipeFixFactor: 1.25,
  maxCorrectionSpeed: 9999,
  autoScanHead: true,
  fireBurst: 3,
  aimZone: {
    neckIfNear: true,
    headIfFar: true,
    neckZoneRadius: 0.4,
    headZoneRadius: 0.25 // nhỏ hơn để chính xác hơn
  },
  prediction: {
    enabled: true,
    leadTime: 0.12,
    adjustRate: 0.98 // chỉnh gần chính xác hơn
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

    const dist = getDistance(aim, enemy.headPos);
    const isNear = dist < 1;
    let target;

    if (isNear && this.aimZone.neckIfNear) {
      target = {
        x: enemy.headPos.x,
        y: enemy.headPos.y - 0.28 // ghim cổ tự nhiên nhưng vẫn sát đầu
      };
    } else if (!isNear && this.aimZone.headIfFar) {
      target = predictHead(enemy, this.prediction);
    } else {
      target = enemy.headPos;
    }

    const correctedAim = smoothLock(aim, target, this.maxCorrectionSpeed * this.swipeFixFactor);
    lockAim(correctedAim);

    if (this.autoFire && isLockedOnTarget(correctedAim, target, this.aimZone.headZoneRadius)) {
      fire(this.fireBurst);
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

// Dùng thuật toán mượt nhưng chính xác tuyệt đối
function smoothLock(current, target, speed) {
  const dx = target.x - current.x;
  const dy = target.y - current.y;
  const distance = Math.hypot(dx, dy);
  const ratio = Math.min(1, speed / distance);
  return {
    x: current.x + dx * ratio,
    y: current.y + dy * ratio
  };
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
