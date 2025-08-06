
// ==UserScript==
// @name         GhostAI_QuantumLock v99.9 – Final Version
// @version      99.9
// @description  Ghim đầu tốc độ lượng tử, override vuốt, bắn xuyên nhảy – Hỗ trợ squad, MP40, M1014
// ==/UserScript==

const ghostAI = {
  config: {
    aimLockPower: 99999,
    quantumPredict: true,
    autoFire: true,
    bulletAdjust: "hyper",
    gravityCompensation: true,
    swipeOverride: true,
    antiHumanPattern: true,
    squadLock: true,
    mobileBoost: true,
    iPhoneDPIBoost: true,
    jumpShotAssist: true,
    moveShotTrack: true,
    legitMode: false,
    zeroGravityFlight: true,
    headLockZone: 0.85,
  },
  onTick(player, enemy) {
    if (!enemy || !player) return;

    const predicted = this.quantumPredict(enemy);
    const aimPoint = this.getHead(predicted);

    if (this.config.swipeOverride || this.userSwipingHard(player)) {
      this.aimAt(player, aimPoint);
    }

    if (this.config.autoFire && this.lockedOn(aimPoint)) {
      this.shoot(player);
    }
  },
  quantumPredict(enemy) {
    let futurePos = { ...enemy.pos };
    futurePos.x += enemy.vel.x * 0.12;
    futurePos.y += enemy.vel.y * 0.12;
    futurePos.z += enemy.vel.z * 0.12 - 0.05; // gravity adjust
    return futurePos;
  },
  getHead(pos) {
    return { x: pos.x, y: pos.y + 1.6, z: pos.z };
  },
  aimAt(player, target) {
    player.crosshair.x += (target.x - player.crosshair.x) * 0.98;
    player.crosshair.y += (target.y - player.crosshair.y) * 0.98;
    player.crosshair.z += (target.z - player.crosshair.z) * 0.98;
  },
  lockedOn(pos) {
    return true; // simplified for full lock
  },
  shoot(player) {
    player.fire();
  },
  userSwipingHard(player) {
    return player.input.delta > 0.5;
  }
};
game.on("tick", () => {
  ghostAI.onTick(game.player, game.getNearestEnemy());
});
