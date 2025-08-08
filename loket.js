// ==UserScript==
// @name         AutoHeadlockProMax v13.0-GodSquadUltra
// @version      13.0
// @description  Ghim đầu toàn diện Squad – Vuốt nhẹ dính đầu – Ưu tiên head 1000% – Không lệch – Không hụt – AntiBot
// ==/UserScript==

const GodLock = {
  enabled: true,
  aimPower: 9999,
  stickyRange: 150,
  autoLockHead: true,
  burstFire: true,
  burstCount: 4,
  fireRate: 0,
  predictionPower: 1000,
  predictionFactor: 1.8,
  autoHeadCorrect: true,
  correctionThreshold: 1.0,
  humanSwipeOverride: true,
  maxSwipeAssist: 100,
  squadPriority: true,
  lockMostDangerous: true,
  avoidWallLock: true,
  adjustForScope: true,
  dynamicScopeBoost: {
    hipfire: { aimSpeed: 5000, factor: 1.4 },
    redDot: { aimSpeed: 6000, factor: 1.5 },
    2:      { aimSpeed: 6500, factor: 1.6 },
    4:      { aimSpeed: 7000, factor: 1.8 }
  },
  lockCurve: (dist) => dist < 30 ? 1.8 : dist < 60 ? 1.4 : 1.1,
};

function onGameTick(game) {
  if (!GodLock.enabled || !game.hasEnemyInSight()) return;

  const enemies = game.getEnemiesSortedByDanger();
  const target = enemies.find(e => e.visible && !e.isBehindWall);
  if (!target) return;

  const head = target.getBone("head");
  if (!head) return;

  const dist = game.distanceTo(head);
  const curve = GodLock.lockCurve(dist);
  const prediction = target.velocity.clone().multiplyScalar(GodLock.predictionFactor * curve);
  const aimPosition = head.position.clone().add(prediction);

  if (GodLock.autoHeadCorrect) {
    const delta = game.crosshair.distanceTo(head.position);
    if (delta > GodLock.correctionThreshold)
      game.crosshair.moveToward(head.position, GodLock.aimPower);
  }

  if (GodLock.humanSwipeOverride && game.player.isSwiping) {
    const swipeAccuracy = game.estimateSwipeAccuracy(head.position);
    if (swipeAccuracy > 0.7) {
      game.crosshair.snapTo(head.position, GodLock.maxSwipeAssist);
    }
  } else {
    game.crosshair.snapTo(aimPosition, GodLock.aimPower);
  }

  if (GodLock.burstFire && game.canShoot()) {
    for (let i = 0; i < GodLock.burstCount; i++) {
      setTimeout(() => game.fire(), i * GodLock.fireRate);
    }
  }
}

// Giả lập Tick
setInterval(() => {
  if (typeof game !== 'undefined') onGameTick(game);
}, 16);
