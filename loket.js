// ==UserScript==
// @name         GhostAI_QuantumLock v200.0-GigaFinal
// @version      200.0
// @description  LockHead tuyệt đối – AimForce 1000000% – Auto Ghim Trước Khi Vuốt – Siêu Mượt FPS Tối Đa – Không Giật – Bất chấp mọi khoảng cách
// @match        *://*/*
// ==/UserScript==

const GhostAI = {
  aimPower: Infinity,
  lockForce: 999999,
  recoilControl: true,
  aimPrediction: true,
  smoothFollow: true,
  noDelay: true,
  autoHeadLock: true,
  preAim: true,
  predictionOffset: 0.01,
  bulletMagnet: true,
  multiBulletSupport: true,
  burstMode: true,
  maxRange: 9999,
  minRange: 0,
  followOnMove: true,
  stabilizeCrosshair: true,
  frameBoost: true,
  performanceMode: true,
  fpsUnlock: true,
  stickyHeadTrack: true,
  maxFPS: 9999,
};

game.on("tick", () => {
  if (!game.enemy.visible || !game.scope.active) return;

  const target = game.enemy.head;
  let distance = game.player.distanceTo(target);
  if (distance < GhostAI.maxRange && distance > GhostAI.minRange) {
    let predictedPos = game.predict(target, GhostAI.predictionOffset);
    if (GhostAI.autoHeadLock || GhostAI.preAim) {
      if (GhostAI.bulletMagnet && GhostAI.multiBulletSupport) {
        game.aimAt(predictedPos, {
          force: GhostAI.lockForce,
          sticky: GhostAI.stickyHeadTrack,
          smooth: GhostAI.smoothFollow,
        });
      }

      if (GhostAI.burstMode) {
        game.fireBurst(3);
      }

      if (GhostAI.recoilControl) {
        game.controlRecoil(0);
      }
    }

    if (GhostAI.frameBoost || GhostAI.performanceMode) {
      game.setFPS(GhostAI.maxFPS);
    }

    if (GhostAI.followOnMove) {
      game.lockOnMove(predictedPos);
    }

    if (GhostAI.stabilizeCrosshair) {
      game.stabilizeAim(predictedPos);
    }
  }
});
