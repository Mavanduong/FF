// ==UserScript==
// @name         GhostAI Tactical v15.0-GodSwipeFinalPlus
// @version      15.0
// @description  Ghim đầu từng viên – Dự đoán địch – Vuốt nhẹ là chết – Không thể lệch, không thể sống
// ==/UserScript==

const ghostAI = {
  aimLock: true,
  stickyLock: true,
  reAimEveryFrame: true,
  viscosity: 1.25,             // Tăng độ dính siêu cấp
  headBias: 1.5,               // Ưu tiên head cực mạnh
  bulletMagnet: true,
  bulletCorrection: {
    enable: true,
    predictMove: true,
    gravityAdjust: true,
    wallBypass: true,          // Mới: xử lý né tường
    offsetTolerance: 0.0005,   // Ghim chính xác tuyệt đối
    smoothCurve: true,         // Mới: đạn đi theo quỹ đạo tự nhiên
  },
  fireControl: {
    autoFire: true,
    burstMode: true,
    burstSettings: {
      rifle: { bullets: 10, interval: 18 },  // Bắn nhanh, gọn
      smg:   { bullets: 12, interval: 15 },
      other: { bullets: 7, interval: 25 }
    },
  },
  antiSlip: true,
  humanSwipeTrigger: true,
  autoHeadlockOnSwipe: true,
  reLockMissedShot: true,
  legitSwipeSim: true,
  evadeTrackingAI: true,
  simulateHumanAimPath: true,
  neckFallback: true,           // Mới: fallback về cổ nếu địch nhảy
  multiTargetSmartLock: true,   // Mới: xử lý nhiều địch cùng lúc
};

// 🔁 Tick Game
game.on('tick', () => {
  const enemy = detectClosestEnemy();
  if (!enemy || !enemy.headPos) return;

  let targetPos = enemy.headPos;

  // Nếu địch đang nhảy → fallback về cổ
  if (ghostAI.neckFallback && enemy.isJumping && enemy.neckPos) {
    targetPos = enemy.neckPos;
  }

  // → Re-aim mỗi frame
  if (ghostAI.aimLock && ghostAI.reAimEveryFrame) {
    aim.snapTo(targetPos, {
      strength: ghostAI.viscosity,
      bias: ghostAI.headBias,
    });
  }

  // → Bullet Magnet logic (nâng cao)
  if (ghostAI.bulletMagnet && ghostAI.bulletCorrection.enable) {
    aim.adjustBulletPath(targetPos, {
      predict: ghostAI.bulletCorrection.predictMove,
      gravity: ghostAI.bulletCorrection.gravityAdjust,
      wallBypass: ghostAI.bulletCorrection.wallBypass,
      tolerance: ghostAI.bulletCorrection.offsetTolerance,
      smoothCurve: ghostAI.bulletCorrection.smoothCurve,
    });
  }

  // → Sticky Lock logic
  if (ghostAI.stickyLock) {
    aim.stickyTo(targetPos, ghostAI.viscosity);
  }

  // → Vuốt là ghim
  if (ghostAI.humanSwipeTrigger && player.isSwiping) {
    aim.lockOn(targetPos, 1.0);
    fire.trigger();
  }

  // → Auto Burst Fire
  if (ghostAI.fireControl.autoFire && ghostAI.fireControl.burstMode) {
    const weapon = getEquippedWeapon();
    const config = ghostAI.fireControl.burstSettings[weapon.type] || ghostAI.fireControl.burstSettings.other;
    fire.burst(config.bullets, config.interval, targetPos);
  }

  // → Nếu lệch → Re-snap
  if (ghostAI.reLockMissedShot && aim.isOffTarget(targetPos)) {
    aim.snapTo(targetPos, { strength: 1.0 });
  }

  // → Smart Multi-target Lock (mới)
  if (ghostAI.multiTargetSmartLock) {
    const targets = detectMultipleEnemies();
    targets.forEach(t => {
      if (t.headPos && isThreat(t)) {
        aim.prioritize(t.headPos, 1.0);
      }
    });
  }
});

// 🛡 Kích hoạt bảo vệ tối đa
ghostAI.setProtection = () => {
  enableAntiBan();
  if (ghostAI.legitSwipeSim) simulateSwipePath();
  if (ghostAI.evadeTrackingAI) evadeAITracking();
  if (ghostAI.simulateHumanAimPath) humanizeAimPath();
};
ghostAI.setProtection();
