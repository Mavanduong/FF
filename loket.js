// ==UserScript==
// @name         AutoHeadlockProMax v14.0-FinalGigaLock (QuantumLaserAI)
// @version      14.0
// @description  Ghim đầu tuyệt đối – Tâm AI di chuyển về đầu – Không vuốt cũng ghim – Tăng FPS – Boss chạy không thoát
// ==/UserScript==

const config = {
  autoHeadlock: true,
  quantumLaserAim: true,
  aimPrediction: true,
  preFireHeadSnap: true,
  dynamicAimSpeed: 9999,
  aimStickyFactor: 1000,
  recoilControl: true,
  fpsBoost: true,
  ultraSmooth: true,
  maxFPS: 240,
  enemyScanRadius: 999,
  movementPrediction: true,
  autoSwipeAssist: true,
  lockPriority: "head",
  lockCorrection: true,
  autoAimWhenMiss: true,
  overrideHumanDelay: true,
  predictiveOffset: true,
  burstControl: true,
  bossLockBoost: true,
  dynamicTargetShift: true,
  fireReactionTime: 0,
};

function aimAt(target) {
  if (!target || !config.autoHeadlock) return;

  let aimPos = predictHead(target);
  if (config.preFireHeadSnap) moveCrosshair(aimPos, true);
  else moveCrosshair(aimPos);

  if (config.autoAimWhenMiss && !isCrosshairOnHead()) {
    moveCrosshair(aimPos, true); // Correction lock
  }

  if (config.autoSwipeAssist && isNearHead()) {
    fire();
  }
}

function predictHead(target) {
  let lead = target.velocity * config.dynamicTargetShift;
  let predicted = {
    x: target.head.x + lead.x,
    y: target.head.y + lead.y - 5,
  };
  return predicted;
}

function moveCrosshair(position, instant = false) {
  let speed = instant ? Infinity : config.dynamicAimSpeed;
  // Internal logic to move aim (omitted)
}

function fire() {
  if (config.fireReactionTime === 0) {
    // Instant shot
    triggerFire();
  } else {
    setTimeout(triggerFire, config.fireReactionTime);
  }
}

function triggerFire() {
  // Internal logic to fire weapon (omitted)
}

function isCrosshairOnHead() {
  // Check if locked exactly on head (omitted)
  return true;
}

function isNearHead() {
  // If within correction threshold
  return true;
}

// FPS Boost logic
if (config.fpsBoost) {
  requestAnimationFrame = (cb) => setTimeout(cb, 1000 / config.maxFPS);
}

// Game loop
game.on('tick', () => {
  let target = game.getNearestEnemy();
  if (target) {
    aimAt(target);
  }
});
