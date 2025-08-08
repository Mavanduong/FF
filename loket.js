// ==UserScript==
// @name         AutoHeadlockProMax v11.9-GodModeX
// @version      11.9
// @description  Ghim đầu tự động AI – Vuốt hay không vuốt đều aim – FPS Boost + Max Stability – Shadowrocket Ready
// ==/UserScript==

const AutoHeadlockConfig = {
  aimPower: 9999,
  aimSpeed: 9999,
  preFireLock: true, // Tự aim lên đầu khi nhấn bắn, không cần vuốt
  maxDistance: Infinity,
  stickyAim: true,
  dynamicCorrection: true,
  followHeadDirection: true,
  smoothAutoLift: true,
  fpsBoost: true,
  pingFake: 25,
  multiBulletSupport: true,
  predictHeadSwipe: true,
  antiMiss: true,
  laserLock: true,
  wallCheck: false,
  memoryAim: true,
  stableAllMove: true,
  overrideHuman: true
};

function onGameTick(game) {
  if (!game || !game.enemies || !game.localPlayer) return;

  game.enemies.forEach(enemy => {
    if (!enemy.isAlive || !enemy.isVisible) return;

    const head = enemy.getBone("head");
    const distance = game.getDistance(game.localPlayer.position, head);

    if (distance <= AutoHeadlockConfig.maxDistance) {
      const predicted = game.predict(head.position, enemy.velocity, AutoHeadlockConfig.predictHeadSwipe);
      const aimVector = game.getAimVector(predicted, game.localPlayer);

      if (AutoHeadlockConfig.preFireLock && game.localPlayer.isFiring) {
        game.setAim(aimVector, AutoHeadlockConfig.aimPower);
      }

      if (AutoHeadlockConfig.stickyAim || AutoHeadlockConfig.smoothAutoLift) {
        game.smoothAimAt(predicted, AutoHeadlockConfig.aimSpeed);
      }

      if (AutoHeadlockConfig.overrideHuman && game.localPlayer.swipeNearHead(enemy)) {
        game.correctAim(predicted);
      }
    }
  });

  if (AutoHeadlockConfig.fpsBoost) {
    game.setFPS(90);
    game.optimizeGraphics();
  }

  if (AutoHeadlockConfig.pingFake) {
    game.fakePing(AutoHeadlockConfig.pingFake);
  }
}

game.on("tick", () => onGameTick(game));
