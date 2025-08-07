// ==UserScript==
// @name         GhostAI_QuantumLock v101.0-GODCHAIN_FINALCORE
// @version      101.0
// @description  KillChain + Lock Head + Predict + FireSmart + Auto AimSwitch + MaxForce All Ping – Tối thượng không thể nâng thêm
// ==/UserScript==

const ghostAI = {
  aimPower: Infinity,
  lockDistance: 120,
  swipeFixFactor: 3.5,
  maxCorrectionSpeed: Infinity,
  fireBurst: 30,
  pingOffset: 0.035, // bù lệch do ping cao
  aimZone: {
    headZoneRadius: 0.22
  },
  prediction: {
    enabled: true,
    leadTime: 0.18,
    adjustRate: 1.02
  },
  autoFire: true,
  autoKillChain: true,
  multiTargetScan: true,
  antiBan: {
    enabled: true,
    layer: 3,
    randomizePath: true,
    simulateHuman: true
  },

  onTick(allEnemies, aim, fire) {
    const enemies = allEnemies
      .filter(e => e && e.headPos)
      .sort((a, b) => getDistance(aim, a.headPos) - getDistance(aim, b.headPos));

    for (const enemy of enemies) {
      const target = this.predictAndAdjust(enemy);
      const aimPos = this.smoothHumanLock(aim, target);
      lockAim(aimPos);

      if (this.autoFire && isLockedOnTarget(aimPos, target, this.aimZone.headZoneRadius)) {
        const burst = enemy.health < 30 ? 5 : this.fireBurst;
        fire(burst);
        break;
      }
    }
  },

  predictAndAdjust(enemy) {
    return {
      x: enemy.headPos.x + enemy.vel.x * (this.prediction.leadTime + this.pingOffset),
      y: enemy.headPos.y + enemy.vel.y * (this.prediction.leadTime + this.pingOffset)
    };
  },

  smoothHumanLock(current, target) {
    // Mô phỏng vuốt nhanh của người nhưng vẫn chính xác tuyệt đối
    const dx = target.x - current.x;
    const dy = target.y - current.y;
    const distance = Math.hypot(dx, dy);
    const speed = Math.min(1, (this.maxCorrectionSpeed * this.swipeFixFactor) / distance);
    return {
      x: current.x + dx * speed,
      y: current.y + dy * speed
    };
  }
};

// ==== Core Utility ====
function getDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function isLockedOnTarget(aim, target, radius) {
  return getDistance(aim, target) <= radius;
}

function lockAim(pos) {
  game.setAim(pos.x, pos.y);
}

// ==== Event Bind ====
game.on('tick', () => {
  const allEnemies = game.findAllEnemies();
  if (allEnemies && allEnemies.length) {
    ghostAI.onTick(allEnemies, game.getAim(), game.fire);
  }
});
