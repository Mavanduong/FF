// ==UserScript==
// @name         GhostAI Tactical v17.0 FINAL – QuantumAura GodMode
// @version      17.0
// @description  Ghim đầu tuyệt đối – Tự học – Bẻ đạn – Điều khiển tâm – Không lệch dù 1 pixel
// ==/UserScript==

const ghostAI = {
  aimLock: true,
  stickyLock: true,
  reAimEveryFrame: true,
  viscosity: 999999,
  headBias: 999999,
  bulletMagnet: true,
  bulletCorrection: {
    enable: true,
    predictMove: true,
    gravityAdjust: false,
    wallBypass: true,
    offsetTolerance: 0.000000001,
    smoothCurve: true,
    recoilCompensate: true,
  },
  fireControl: {
    autoFire: true,
    burstMode: true,
    burstSettings: {
      rifle: { bullets: 15, interval: 7 },
      smg:   { bullets: 18, interval: 5 },
      other: { bullets: 12, interval: 9 }
    },
  },
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
  learnEnemyPattern: true,
  autoAdjustToEnemyType: true,

  // 🔥 Quantum & GodMode Modules
  quantumAnchorLock: true,
  quantumTeleportSnap: true,
  phantomPredict: true,
  futureTickPrediction: 3,
  antiPhysicsOverride: true,
  ignoreObstacles: true,
  zeroGravityAim: true,
  hyperReactAim: true,
  reactionTimeMs: 5,
  neuralOverride: true,
  aiDecideBestLock: true,
  enemyPredictionModel: "LSTM-RNN",
  multiLayerSnap: true,
  snapLayers: 3,
  hyperLockFeedbackLoop: true,
  deviationThreshold: 0.00001,
  vectorWarpCorrection: true,
  temporalShotSync: true,
  shotDelayMs: 42,
  godlikeSwipeAdaptation: true,
  camMatrixLock: true,
  collisionPredictionAI: true,
  aimPossessionOverride: true,
  overrideSensitivity: 1.0,
  smartHeadZoneTargeting: true,
  bulletPathAIReRouting: true,
};

// 🧠 Enemy memory
let enemyMemory = new Map();
function learnEnemyBehavior(enemy) {
  if (!enemy) return;
  const id = enemy.id;
  if (!enemyMemory.has(id)) enemyMemory.set(id, []);
  const history = enemyMemory.get(id);
  history.push({ pos: enemy.headPos, time: Date.now(), velocity: enemy.velocity });
  if (history.length > 25) history.shift();
}

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
    x: enemy.headPos.x + dx / dt * 0.2,
    y: enemy.headPos.y + dy / dt * 0.2,
    z: enemy.headPos.z + dz / dt * 0.2,
  };
}

// 🔁 Main loop
game.on('tick', () => {
  const enemy = detectClosestEnemy();
  if (!enemy) return;

  if (ghostAI.learnEnemyPattern) learnEnemyBehavior(enemy);

  let targetPos = ghostAI.phantomPredict
    ? predictSmart(enemy)
    : enemy.headPos;

  if (ghostAI.quantumTeleportSnap) {
    const ping = getPing() * 0.001;
    targetPos.x += enemy.velocity.x * ping;
    targetPos.y += enemy.velocity.y * ping;
    targetPos.z += enemy.velocity.z * ping;
  }

  if (ghostAI.vectorWarpCorrection) {
    targetPos.x += enemy.velocity.x * 0.05;
    targetPos.y += enemy.velocity.y * 0.05;
    targetPos.z += enemy.velocity.z * 0.05;
  }

  if (ghostAI.smartHeadZoneTargeting && enemy.headBlocked) {
    targetPos = enemy.neckPos || enemy.headPos;
  }

  if (ghostAI.antiPhysicsOverride) {
    aim.ignoreWalls = ghostAI.ignoreObstacles;
    aim.gravityScale = ghostAI.zeroGravityAim ? 0 : 1;
  }

  if (ghostAI.camMatrixLock) {
    aim.setViewMatrixTo(targetPos);
  }

  if (ghostAI.collisionPredictionAI && isObstacleBetween(player, enemy)) {
    return;
  }

  if (ghostAI.aimPossessionOverride && player.isDraggingWrong) {
    aim.overrideDrag(targetPos, ghostAI.overrideSensitivity);
  }

  if (ghostAI.neuralOverride && ghostAI.aiDecideBestLock && evaluateThreat(enemy) > 0.8) {
    aim.lockOn(enemy.headPos, 1.0);
    fire.trigger();
  }

  for (let i = 0; i < (ghostAI.multiLayerSnap ? ghostAI.snapLayers : 1); i++) {
    if (ghostAI.aimLock) {
      aim.snapTo(targetPos, {
        strength: ghostAI.viscosity,
        bias: ghostAI.headBias,
      });
    }
  }

  if (ghostAI.stickyLock) {
    aim.stickyTo(targetPos, ghostAI.viscosity);
  }

  if (ghostAI.bulletMagnet && ghostAI.bulletCorrection.enable) {
    aim.adjustBulletPath(targetPos, {
      predict: true,
      gravity: ghostAI.bulletCorrection.gravityAdjust,
      wallBypass: true,
      tolerance: ghostAI.bulletCorrection.offsetTolerance,
      smoothCurve: true,
      recoilCompensate: true,
    });
  }

  if (ghostAI.hyperLockFeedbackLoop && aim.isOffTarget(targetPos, ghostAI.deviationThreshold)) {
    aim.snapTo(targetPos, { strength: 999999 });
  }

  if (ghostAI.temporalShotSync) {
    setTimeout(() => {
      fire.trigger();
    }, ghostAI.shotDelayMs);
  }

  if (ghostAI.humanSwipeTrigger && player.isSwiping) {
    aim.lockOn(targetPos, 1.0);
    fire.trigger();
  }

  if (ghostAI.autoHeadlockOnSwipe && player.isSwipingToHead(enemy)) {
    aim.lockOn(enemy.headPos, 1.0);
  }

  if (ghostAI.fireControl.autoFire && ghostAI.fireControl.burstMode) {
    const weapon = getEquippedWeapon();
    const config = ghostAI.fireControl.burstSettings[weapon.type] || ghostAI.fireControl.burstSettings.other;
    fire.burst(config.bullets, config.interval, targetPos);
  }

  if (ghostAI.reLockMissedShot && aim.isOffTarget(targetPos)) {
    aim.snapTo(targetPos, { strength: 999999 });
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

// 🛡 Protection Layer
ghostAI.setProtection = () => {
  enableAntiBan();
  simulateSwipePath();
  evadeAITracking();
  humanizeAimPath();
};
ghostAI.setProtection();
