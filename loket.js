// ==UserScript==
// @name         GhostAI_QuantumLock v200.0-UltimateGodKill
// @version      200.0
// @description  Ghim đầu tuyệt đối trước khi địch kịp phản ứng – Mọi khoảng cách – Không giật – Không lệch – Không thua boss
// ==/UserScript==

const GhostAI = {
  lockDistance: 999, // Lock từ xa cực đại
  aimPower: Infinity, // Sức mạnh vô hạn
  autoHeadshot: true,
  stickyLock: true,
  recoilControl: true,
  fpsBoost: true,
  autoScope: true,
  headPrediction: true,
  delayCompensation: true,
  burstMode: true,
  swipeAssist: true,
  predictMoveFactor: 999, // Dự đoán siêu tốc
  aimSpeed: 999999, // Tốc độ cao nhất
  recoilFixPower: 1000, // Không giật hoàn toàn
  godFollowHead: true, // Bám đầu cực mạnh
  fireBeforeSwipe: true, // Bắn trước khi vuốt
  allDistanceLock: true, // Mọi khoảng cách đều lock
  overrideHumanReaction: true,
  gravityCompensation: true,
  latencyHandler: true,
  motionSmoothing: true,
  targetSwitchAI: true,
  hardAimFocus: true
};

game.on('tick', () => {
  const target = game.getNearestEnemy({
    maxDistance: GhostAI.lockDistance,
    mustBeVisible: true,
    prioritizeHead: true
  });

  if (target && GhostAI.autoHeadshot) {
    const predictedHead = game.predictPosition(target.head, GhostAI.predictMoveFactor);

    if (GhostAI.fireBeforeSwipe || game.isFiring()) {
      game.aimAt(predictedHead, {
        speed: GhostAI.aimSpeed,
        smooth: GhostAI.motionSmoothing,
        sticky: GhostAI.stickyLock
      });

      if (GhostAI.recoilControl) {
        game.applyRecoilFix(GhostAI.recoilFixPower);
      }

      if (GhostAI.burstMode) {
        game.autoFireBurst(3);
      }

      if (GhostAI.godFollowHead) {
        game.lockTo(predictedHead, { follow: true, override: true });
      }
    }
  }

  if (GhostAI.fpsBoost) {
    game.optimizeFPS({ aggressive: true });
  }
});
