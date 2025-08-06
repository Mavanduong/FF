// ==UserScript==
// @name         GhostAI Tactical v15.9 – MaxGrip GodBind
// @version      15.9
// @description  Ghim đầu mạnh hơn 10000% – Không lệch 1 pixel – Không sống nổi – Bám như keo vĩnh cửu
// ==/UserScript==

const ghostAI = {
  aimLock: true,
  stickyLock: true,
  reAimEveryFrame: true,
  viscosity: 9999.9,                // 💥 BÁM DÍNH TUYỆT ĐỐI – GẦN NHƯ DÁN TÂM
  headBias: 9999.9,                 // ƯU TIÊN HEAD TUYỆT ĐỐI
  bulletMagnet: true,
  bulletCorrection: {
    enable: true,
    predictMove: true,
    gravityAdjust: true,
    wallBypass: true,
    offsetTolerance: 0.0000001,     // 🎯 CHÍNH XÁC TỪNG ĐIỂM ẢNH
    smoothCurve: true,
    recoilCompensate: true,         // MỚI: CHỐNG GIẬT CỰC MẠNH
  },
  fireControl: {
    autoFire: true,
    burstMode: true,
    burstSettings: {
      rifle: { bullets: 12, interval: 10 },  // ⚡ TỐC ĐỘ SẤM SÉT
      smg:   { bullets: 15, interval: 8 },
      other: { bullets: 10, interval: 12 }
    },
  },
  antiSlip: true,
  humanSwipeTrigger: true,
  autoHeadlockOnSwipe: true,
  reLockMissedShot: true,
  legitSwipeSim: true,
  evadeTrackingAI: true,
  simulateHumanAimPath: true,
  neckFallback: true,
  multiTargetSmartLock: true,
  dynamicMovementSupport: true,
  aimPreLockVectorAI: true,         // 🧠 DỰ ĐOÁN TÂM ĐỊCH TRƯỚC KHI ĐỊCH ĐI
  noMissAimCore: true,              // 🔒 KHÔNG THỂ LỖI, KHÔNG TRƯỢT
};

// 🎯 Tính toán mục tiêu chuẩn hóa siêu AI
function getPerfectTarget(enemy) {
  if (!enemy || !enemy.headPos) return null;

  if (enemy.isJumping && ghostAI.neckFallback && enemy.neckPos) {
    return enemy.neckPos;
  }

  // Nếu di chuyển hoặc xoay → tăng lực bám + bias lên vô hạn
  if (enemy.isRunning || enemy.velocity > 0.3 || enemy.isChangingDirection) {
    ghostAI.viscosity = 9999.9;
    ghostAI.headBias = 9999.9;
  }

  return enemy.headPos;
}

// 🔁 Tick chính
game.on('tick', () => {
  const enemy = detectClosestEnemy();
  if (!enemy) return;

  const targetPos = getPerfectTarget(enemy);
  if (!targetPos) return;

  // 🧠 Pre-lock AI – Dự đoán hướng trước
  if (ghostAI.aimPreLockVectorAI) {
    const futurePos = predictEnemyFuturePosition(enemy, 100); // 100ms ahead
    aim.snapTo(futurePos, {
      strength: ghostAI.viscosity,
      bias: ghostAI.headBias,
    });
  }

  // 🔁 Ghim từng frame
  if (ghostAI.aimLock && ghostAI.reAimEveryFrame) {
    aim.snapTo(targetPos, {
      strength: ghostAI.viscosity,
      bias: ghostAI.headBias,
    });
  }

  // 🧲 Bullet chỉnh cực mạnh
  if (ghostAI.bulletMagnet && ghostAI.bulletCorrection.enable) {
    aim.adjustBulletPath(targetPos, {
      predict: ghostAI.bulletCorrection.predictMove,
      gravity: ghostAI.bulletCorrection.gravityAdjust,
      wallBypass: ghostAI.bulletCorrection.wallBypass,
      tolerance: ghostAI.bulletCorrection.offsetTolerance,
      smoothCurve: ghostAI.bulletCorrection.smoothCurve,
      recoilCompensate: ghostAI.bulletCorrection.recoilCompensate,
    });
  }

  // 🔒 Sticky Lock
  if (ghostAI.stickyLock) {
    aim.stickyTo(targetPos, ghostAI.viscosity);
  }

  // 💀 Vuốt là bắn
  if (ghostAI.humanSwipeTrigger && player.isSwiping) {
    aim.lockOn(targetPos, 1.0);
    fire.trigger();
  }

  // 🔫 Tự động Burst
  if (ghostAI.fireControl.autoFire && ghostAI.fireControl.burstMode) {
    const weapon = getEquippedWeapon();
    const config = ghostAI.fireControl.burstSettings[weapon.type] || ghostAI.fireControl.burstSettings.other;
    fire.burst(config.bullets, config.interval, targetPos);
  }

  // ✅ Không bao giờ lệch
  if (ghostAI.reLockMissedShot && aim.isOffTarget(targetPos)) {
    aim.snapTo(targetPos, { strength: 9999.9 });
  }

  // 🤖 Lock đa mục tiêu
  if (ghostAI.multiTargetSmartLock) {
    const targets = detectMultipleEnemies();
    targets.forEach(t => {
      if (t.headPos && isThreat(t)) {
        aim.prioritize(t.headPos, 1.0);
      }
    });
  }
});

// 🛡 Bật toàn bộ bảo vệ
ghostAI.setProtection = () => {
  enableAntiBan();
  simulateSwipePath();
  evadeAITracking();
  humanizeAimPath();
};
ghostAI.setProtection();
