// ==UserScript==
// @name         GhostAI Tactical v14.9-FinalGodSwipe
// @version      14.9
// @description  Vuốt là chết – Ghim đầu từng viên – Đạn đi đâu ghim theo đó – Không lệch, không sống sót
// ==/UserScript==

const ghostAI = {
  aimLock: true,
  stickyLock: true,
  reAimEveryFrame: true,
  viscosity: 1.0,             // Độ bám max, không trượt
  headBias: 1.0,              // Ưu tiên đầu tuyệt đối
  bulletMagnet: true,
  bulletCorrection: {
    enable: true,
    predictMove: true,
    gravityAdjust: true,
    offsetTolerance: 0.001,   // Không lệch đầu
  },
  fireControl: {
    autoFire: true,
    burstMode: true,
    burstSettings: {
      rifle: { bullets: 8, interval: 25 },   // 8 viên đầu cực nhanh
      smg:   { bullets: 8, interval: 20 },
      other: { bullets: 5, interval: 30 }
    },
  },
  antiSlip: true,
  humanSwipeTrigger: true,
  autoHeadlockOnSwipe: true,
  reLockMissedShot: true,
  legitSwipeSim: true,
  evadeTrackingAI: true,
  simulateHumanAimPath: true,
};

// 🔁 Tick Game
game.on('tick', () => {
  const enemy = detectClosestEnemy();
  if (!enemy || !enemy.headPos) return;

  // → Ghim đầu từng frame
  if (ghostAI.aimLock && ghostAI.reAimEveryFrame) {
    aim.snapTo(enemy.headPos, {
      strength: ghostAI.viscosity,
      bias: ghostAI.headBias,
    });
  }

  // → Bullet Magnet logic
  if (ghostAI.bulletMagnet && ghostAI.bulletCorrection.enable) {
    aim.adjustBulletPath(enemy.headPos, {
      predict: ghostAI.bulletCorrection.predictMove,
      gravity: ghostAI.bulletCorrection.gravityAdjust,
      tolerance: ghostAI.bulletCorrection.offsetTolerance,
    });
  }

  // → Sticky Lock logic
  if (ghostAI.stickyLock) {
    aim.stickyTo(enemy.headPos, ghostAI.viscosity);
  }

  // → Vuốt là chết
  if (ghostAI.humanSwipeTrigger && player.isSwiping) {
    aim.lockOn(enemy.headPos, 1.0);
    fire.trigger();
  }

  // → Bắn burst tự động
  if (ghostAI.fireControl.autoFire && ghostAI.fireControl.burstMode) {
    const weapon = getEquippedWeapon();
    const config = ghostAI.fireControl.burstSettings[weapon.type] || ghostAI.fireControl.burstSettings.other;
    fire.burst(config.bullets, config.interval, enemy.headPos);
  }

  // → Nếu lệch → re-aim
  if (ghostAI.reLockMissedShot && aim.isOffTarget(enemy.headPos)) {
    aim.snapTo(enemy.headPos, { strength: 1.0 });
  }
});

// 🛡 Kích hoạt bảo vệ
ghostAI.setProtection = () => {
  enableAntiBan();
  if (ghostAI.legitSwipeSim) simulateSwipePath();
  if (ghostAI.evadeTrackingAI) evadeAITracking();
  if (ghostAI.simulateHumanAimPath) humanizeAimPath();
};
ghostAI.setProtection();
