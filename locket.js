// ==UserScript==
// @name         GhostAI Tactical v16.0 – NeuralLock AI
// @version      16.0
// @description  Ghim đầu thông minh – Tự học cách địch di chuyển – Không lệch – Không sống
// ==/UserScript==

const ghostAI = {
  aimLock: true,
  stickyLock: true,
  reAimEveryFrame: true,
  viscosity: 99999,
  headBias: 99999,
  bulletMagnet: true,
  bulletCorrection: {
    enable: true,
    predictMove: true,
    gravityAdjust: true,
    wallBypass: true,
    offsetTolerance: 0.00000001,
    smoothCurve: true,
    recoilCompensate: true,
  },
  fireControl: {
    autoFire: true,
    burstMode: true,
    burstSettings: {
      rifle: { bullets: 14, interval: 8 },
      smg:   { bullets: 18, interval: 6 },
      other: { bullets: 10, interval: 10 }
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
  aimPreLockVectorAI: true,
  noMissAimCore: true,
  learnEnemyPattern: true,              // ✅ MỚI: học cách địch di chuyển
  autoAdjustToEnemyType: true,          // ✅ MỚI: phân biệt người / bot
};

// 📚 Học hành vi địch
let enemyMemory = new Map();

function learnEnemyBehavior(enemy) {
  if (!enemy) return;
  const id = enemy.id;
  if (!enemyMemory.has(id)) {
    enemyMemory.set(id, []);
  }

  const history = enemyMemory.get(id);
  history.push({
    pos: enemy.headPos,
    time: Date.now(),
    velocity: enemy.velocity,
  });

  if (history.length > 20) history.shift(); // chỉ giữ 20 lần gần nhất
}

// 🧠 Dự đoán từ hành vi cũ
function predictSmart(enemy) {
  const history = enemyMemory.get(enemy.id);
  if (!history || history.length < 5) return enemy.headPos;

  const last = history[history.length - 1];
  const before = history[history.length - 5];
  const dt = (last.time - before.time) / 1000;
  if (dt <= 0) return enemy.headPos;

  const dx = last.pos.x - before.pos.x;
  const dy = last.pos.y - before.pos.y;
  const dz = last.pos.z - before.pos.z;

  return {
    x: enemy.headPos.x + dx / dt * 0.15,
    y: enemy.headPos.y + dy / dt * 0.15,
    z: enemy.headPos.z + dz / dt * 0.15,
  };
}

// 🔁 Tick chính
game.on('tick', () => {
  const enemy = detectClosestEnemy();
  if (!enemy) return;

  // Học chuyển động
  if (ghostAI.learnEnemyPattern) learnEnemyBehavior(enemy);

  let targetPos = ghostAI.aimPreLockVectorAI
    ? predictSmart(enemy)
    : enemy.headPos;

  if (!targetPos) return;

  // Nếu bot → chuyển sang Lock cực mạnh
  if (ghostAI.autoAdjustToEnemyType && enemy.isBotLike) {
    ghostAI.viscosity = 999999;
    ghostAI.headBias = 999999;
  }

  // Snap + Sticky + Magnet
  if (ghostAI.aimLock && ghostAI.reAimEveryFrame) {
    aim.snapTo(targetPos, {
      strength: ghostAI.viscosity,
      bias: ghostAI.headBias,
    });
  }

  if (ghostAI.stickyLock) {
    aim.stickyTo(targetPos, ghostAI.viscosity);
  }

  if (ghostAI.bulletMagnet && ghostAI.bulletCorrection.enable) {
    aim.adjustBulletPath(targetPos, {
      predict: true,
      gravity: true,
      wallBypass: true,
      tolerance: ghostAI.bulletCorrection.offsetTolerance,
      smoothCurve: true,
      recoilCompensate: true,
    });
  }

  if (ghostAI.humanSwipeTrigger && player.isSwiping) {
    aim.lockOn(targetPos, 1.0);
    fire.trigger();
  }

  if (ghostAI.fireControl.autoFire && ghostAI.fireControl.burstMode) {
    const weapon = getEquippedWeapon();
    const config = ghostAI.fireControl.burstSettings[weapon.type] || ghostAI.fireControl.burstSettings.other;
    fire.burst(config.bullets, config.interval, targetPos);
  }

  if (ghostAI.reLockMissedShot && aim.isOffTarget(targetPos)) {
    aim.snapTo(targetPos, { strength: 99999 });
  }

  if (ghostAI.multiTargetSmartLock) {
    const targets = detectMultipleEnemies();
    targets.forEach(t => {
      if (t.headPos && isThreat(t)) {
        aim.prioritize(t.headPos, 1.0);
      }
    });
  }
});

// 🛡 Bảo vệ toàn diện
ghostAI.setProtection = () => {
  enableAntiBan();
  simulateSwipePath();
  evadeAITracking();
  humanizeAimPath();
};
ghostAI.setProtection();
