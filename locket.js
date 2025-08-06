// ==UserScript==
// @name         GhostAI Tactical v15.5-GodSwipeRunJumpFix
// @version      15.5
// @description  Ghim đầu kể cả đang chạy, nhảy, di chuyển bắn – Vuốt nhẹ là chết – Không lệch, không thoát
// ==/UserScript==

const ghostAI = {
  aimLock: true,
  stickyLock: true,
  reAimEveryFrame: true,
  viscosity: 1.35,              // Bám dính hơn để xử lý chuyển động
  headBias: 1.5,
  bulletMagnet: true,
  bulletCorrection: {
    enable: true,
    predictMove: true,
    gravityAdjust: true,
    wallBypass: true,
    offsetTolerance: 0.0003,
    smoothCurve: true,
  },
  fireControl: {
    autoFire: true,
    burstMode: true,
    burstSettings: {
      rifle: { bullets: 10, interval: 16 },
      smg:   { bullets: 12, interval: 12 },
      other: { bullets: 8, interval: 20 }
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
  dynamicMovementSupport: true,     // 🎯 MỚI: hỗ trợ chạy/nhảy bắn
};

// 🎯 Tối ưu Aim theo trạng thái chuyển động
function getDynamicTarget(enemy) {
  if (!enemy || !enemy.headPos) return null;

  // Nếu địch đang nhảy và có cổ → fallback cổ
  if (enemy.isJumping && ghostAI.neckFallback && enemy.neckPos) {
    return enemy.neckPos;
  }

  // Nếu địch đang chạy → tăng lực ghim, giảm lệch
  if (enemy.isRunning || enemy.velocity > 0.5) {
    ghostAI.viscosity = 1.5;
    ghostAI.headBias = 1.7;
  } else {
    ghostAI.viscosity = 1.35;
    ghostAI.headBias = 1.5;
  }

  return enemy.headPos;
}

// 🔁 Tick Game
game.on('tick', () => {
  const enemy = detectClosestEnemy();
  if (!enemy) return;

  const targetPos = getDynamicTarget(enemy);
  if (!targetPos) return;

  // → Ghim từng frame (có điều chỉnh)
  if (ghostAI.aimLock && ghostAI.reAimEveryFrame) {
    aim.snapTo(targetPos, {
      strength: ghostAI.viscosity,
      bias: ghostAI.headBias,
    });
  }

  // → Bullet Correction nâng cao
  if (ghostAI.bulletMagnet && ghostAI.bulletCorrection.enable) {
    aim.adjustBulletPath(targetPos, {
      predict: ghostAI.bulletCorrection.predictMove,
      gravity: ghostAI.bulletCorrection.gravityAdjust,
      wallBypass: ghostAI.bulletCorrection.wallBypass,
      tolerance: ghostAI.bulletCorrection.offsetTolerance,
      smoothCurve: ghostAI.bulletCorrection.smoothCurve,
    });
  }

  // → Sticky Lock
  if (ghostAI.stickyLock) {
    aim.stickyTo(targetPos, ghostAI.viscosity);
  }

  // → Vuốt là chết
  if (ghostAI.humanSwipeTrigger && player.isSwiping) {
    aim.lockOn(targetPos, 1.0);
    fire.trigger();
  }

  // → Auto Burst
  if (ghostAI.fireControl.autoFire && ghostAI.fireControl.burstMode) {
    const weapon = getEquippedWeapon();
    const config = ghostAI.fireControl.burstSettings[weapon.type] || ghostAI.fireControl.burstSettings.other;
    fire.burst(config.bullets, config.interval, targetPos);
  }

  // → Nếu lệch → Re-aim
  if (ghostAI.reLockMissedShot && aim.isOffTarget(targetPos)) {
    aim.snapTo(targetPos, { strength: 1.0 });
  }

  // → Ưu tiên địch nguy hiểm nếu có nhiều
  if (ghostAI.multiTargetSmartLock) {
    const targets = detectMultipleEnemies();
    targets.forEach(t => {
      if (t.headPos && isThreat(t)) {
        aim.prioritize(t.headPos, 1.0);
      }
    });
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
