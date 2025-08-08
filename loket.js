// ==UserScript==
// @name         AutoHeadlockProMax v14.0-GigaNeck2HeadAI
// @version      14.0
// @description  Vuốt lệch cổ vẫn aim về đầu, nhấn bắn là tự tâm kéo lên đầu trước - Free Fire iOS Shadowrocket
// ==/UserScript==

const cfg = {
  lock: true,
  headCorrection: true,
  bulletPredict: true,
  neckToHeadAim: true,
  autoLiftOnFire: true,
  stickyAim: true,
  recoilBlock: true,
  ghostSwipe: true,
  scanRadius: 120,
  predictionPower: 1.27,
  fireBoostDelay: 12,
  neckErrorMargin: 0.7,
  headLiftForce: 1.65,
  fps: 60,
};

game.on('tick', () => {
  if (!cfg.lock) return;

  const target = game.findNearestEnemy(cfg.scanRadius);
  if (!target || !target.isAlive) return;

  let headPos = target.headPosition;
  let aimPos = headPos;

  if (cfg.neckToHeadAim && game.crosshair.isNear(target.neckPosition, cfg.neckErrorMargin)) {
    aimPos = game.interpolate(target.neckPosition, headPos, cfg.headLiftForce);
  }

  if (cfg.bulletPredict) {
    aimPos = game.predictPosition(aimPos, target.velocity, cfg.predictionPower);
  }

  game.aimAt(aimPos, cfg.stickyAim ? 'sticky' : 'smooth');
});

game.on('fire', () => {
  if (!cfg.autoLiftOnFire) return;

  const lift = cfg.headLiftForce * 2.2;
  game.moveCrosshairY(-lift); // Kéo tâm lên đầu trước khi đạn bay
});
