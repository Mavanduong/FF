// ==UserScript==
// @name         AutoHeadlockProMax v11.9.999-GODCORE_FUSION_FINAL
// @version      11.9.999
// @description  Ghim đầu tuyệt đối – Tâm bám 100% vào đầu – Không giật – Tự ưu tiên mục tiêu mạnh – Bán kính toàn bản đồ – Max sức mạnh
// ==/UserScript==

const GODCORE = {
  aimPower: 99999999,
  maxDistance: Infinity,
  headRadius: 1.5,
  lockOnAll: true,
  fullPrediction: true,
  stickyLock: true,
  recoilControl: true,
  smoothness: 0.0001,
  autoAdjustHead: true,
  supportSwipeOverride: true,
  scopeBoost: true,
  burstCorrection: true,
  predictionFactor: 1.9999,
  lockThroughWall: true,
  laserFollow: true,
  enemyPriority: true,
};

game.on('tick', () => {
  if (!game.player || !game.player.scopeActive) return;

  const enemies = game.enemies.filter(e => e && e.head && !e.dead);
  if (!enemies.length) return;

  let best = null;
  let bestScore = -Infinity;

  for (const enemy of enemies) {
    const headPos = enemy.head.position;
    const dist = game.player.distanceTo(headPos);
    if (dist > GODCORE.maxDistance) continue;

    const predicted = enemy.predictPosition(GODCORE.predictionFactor);
    const score = 999999 - dist - (enemy.health * 10) + (enemy.dangerLevel * 1000);

    if (score > bestScore) {
      best = enemy;
      bestScore = score;
    }
  }

  if (best) {
    const headTarget = best.head.position;
    const aimDirection = game.player.calculateAim(headTarget, {
      smoothness: GODCORE.smoothness,
      sticky: GODCORE.stickyLock,
      predict: GODCORE.fullPrediction,
    });

    game.player.aimAt(aimDirection, GODCORE.aimPower);

    if (GODCORE.recoilControl) {
      game.player.controlRecoil();
    }

    if (GODCORE.autoAdjustHead && game.player.crosshairOffset(headTarget) > GODCORE.headRadius) {
      game.player.snapAim(headTarget);
    }

    if (GODCORE.scopeBoost && game.player.scopeActive) {
      game.player.aimPower += 9999999;
    }
  }
});
