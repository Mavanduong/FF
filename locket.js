// ==UserScript==
// @name         GhostAI_QuantumLock v101.9 – HEADMAGNET ABSOLUTE LOCK
// @version      101.9
// @description  Ghim đầu mạnh nhất – Aim không lệch – Dù vuốt hay ping cao vẫn lock như nam châm – Fire toàn băng
// ==/UserScript==

const ghostAI = {
  aimPower: Infinity,
  lockDistance: 150,
  swipeFixFactor: 999, // kéo cực mạnh – vượt mọi lệch
  maxCorrectionSpeed: Infinity, // không giới hạn
  fireBurst: 30,
  aimZone: {
    headZoneRadius: 0.25 // chính xác đầu
  },
  prediction: {
    enabled: true,
    leadTime: 0.18,
    adjustRate: 1.05 // siết sát vị trí địch
  },
  autoFire: true,
  autoKillChain: true,
  forceHeadMagnet: true, // ← mới: hút cứng vào đầu
  pingCompensate: 0.05,  // ← bù trễ đạn
  reAimEveryFrame: true, // ← luôn ghim lại mỗi khung hình
  antiBan: {
    enabled: true,
    layer: 3,
    randomizePath: true,
    simulateHuman: true
  },

  onTick(enemies, aim, fire) {
    if (!enemies.length) return;
    const enemy = this.selectTarget(enemies, aim);
    if (!enemy || !enemy.headPos) return;

    const predicted = this.predictHead(enemy);
    const corrected = this.forceLockAim(aim, predicted);
    lockAim(corrected);

    if (this.autoFire && isLockedOnTarget(corrected, predicted, this.aimZone.headZoneRadius)) {
      fire(this.fireBurst);
    }
  },

  selectTarget(enemies, aim) {
    return enemies
      .filter(e => e && e.headPos)
      .sort((a, b) => getDistance(aim, a.headPos) - getDistance(aim, b.headPos))[0];
  },

  predictHead(enemy) {
    const time = this.prediction.leadTime + this.pingCompensate;
    return {
      x: enemy.headPos.x + enemy.vel.x * time,
      y: enemy.headPos.y + enemy.vel.y * time
    };
  },

  forceLockAim(current, target) {
    // Không dùng nội suy – ghim thẳng 100%
    return {
      x: target.x,
      y: target.y
    };
  }
};

// ==== CORE ====
function getDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function isLockedOnTarget(aim, target, radius) {
  return getDistance(aim, target) <= radius;
}

function lockAim(pos) {
  game.setAim(pos.x, pos.y);
}

game.on('tick', () => {
  const enemies = game.findAllEnemies();
  if (enemies && enemies.length) {
    ghostAI.onTick(enemies, game.getAim(), game.fire);
  }
});

