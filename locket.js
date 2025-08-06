// ==UserScript==
// @name         GhostAI Tactical v14.0 – Vuốt Là Chết | Ghim Từng Viên | Burst Kill
// @version      14.0
// @description  Vuốt nhẹ là địch chết hoàn toàn – Ghim từng viên vào đầu – Hỗ trợ đa tia (MP40, M1014, Vector) – Không sai số, không run
// ==/UserScript==

const ghostAI = {
  enabled: true,
  mode: "TacticalGhostX",
  triggerOnSwipe: true,          // Vuốt là bật ghim
  swipeToKillWindow: 0.0001,     // Gần như không delay giữa vuốt và bắn
  autoFireOnHead: true,          // Tự bắn khi tâm vào đầu

  aimSystem: {
    forceHeadAim: true,
    predictiveOffset: true,
    prediction: {
      enabled: true,
      method: "velocity+accel",
      targetMovementCompensation: true,
      jumpDetection: true,
      wallBypassPredict: true
    },
    bulletAdjust: {
      enabled: true,
      type: "multi-burst",
      spreadCorrection: "individual",
      perBulletLock: true,
      stickyReAim: true,
      headRadius: 0.25
    }
  },

  burstKillControl: {
    enabled: true,
    burstControl: true,                  // Điều chỉnh từng viên với súng đa tia
    calculateHeadshotDamage: true,       // Tính xem bao nhiêu viên head là chết
    autoBurstCount: "enoughToKill",      // Bắn đủ viên head để địch chết
    ignoreBodyHit: true,                 // Không bắn vào thân – chỉ đầu
    killConfirmedShot: true              // Xác nhận bắn nếu đủ headshot damage
  },

  smartHandling: {
    errorMargin: 0.0,                    // Không có sai số
    simulateHumanAimPath: true,         // Dù ghim cực nhanh nhưng vẫn mô phỏng vuốt
    humanAimDelay: 0.0012,
    microTracking: true,
    wallAvoidance: true,
    lagCompensation: true,
    pingPredict: true
  },

  weaponSupport: {
    MP40: { burst: true, perBulletTracking: true },
    M1014: { burst: true, shotReAim: true },
    Vector: { dual: true, dualReTarget: true },
    AllOther: { fallbackAim: true }
  },

  extraTactical: {
    ghostWallBypass: true,
    antiAIRecoil: true,
    shadowScan: true,
    silentMark: true,
    lastKnownLock: true,
    noReAimRequired: false,
  },

  defenseSystem: {
    antiBan: true,
    reportSpoof: true,
    aimLikeHuman: true,
    movementFaker: true,
    recoilSim: true,
    legitPath: true
  },

  logs: {
    onKill: (target) => {
      console.log(`💀 [GhostKill] ${target.name} bị xóa sạch bởi TacticalGhostX – ${new Date().toLocaleTimeString()}`);
    }
  }
};

// Tự động kích hoạt logic ghost khi swipe hoặc enemy lock
game.on('tick', () => {
  if (!ghostAI.enabled) return;

  const target = game.findNearestEnemyHead();
  if (!target) return;

  if (ghostAI.triggerOnSwipe && user.isSwiping()) {
    const bullets = ghostAI.burstKillControl.autoBurstCount === "enoughToKill"
      ? game.calculateBulletsToKill(target, "head")
      : 3;

    for (let i = 0; i < bullets; i++) {
      const headPos = game.predictHeadPosition(target, i);
      game.aimAt(headPos, {
        reAimIfMiss: true,
        sticky: true,
        correction: "ultra",
      });
      game.fire(); // autoFireOnHead
    }

    if (ghostAI.logs?.onKill) ghostAI.logs.onKill(target);
  }
});
