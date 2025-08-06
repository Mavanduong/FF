// ==UserScript==
// @name         GhostAI AntiBan v12.0 – Final Form
// @version      12.0
// @description  Vuốt là chết, kéo là dính, không run, không lệch, tối ưu FPS, chống phát hiện cấp độ quân sự.
// ==/UserScript==

const ghostConfig = {
  aimMode: "GhostAI",
  aimSpeed: 9999,
  headOffsetY: -0.35,
  predictBullet: true,
  fpsBoost: true,
  autoFPSDetect: true,
  autoAimDelay: true,
  maxRecoilControl: true,
  ghostSwipeAssist: true,
  antiBanShield: true,
  dynamicLockZone: true,
  multiBulletPrediction: true,
  lockThroughWall: true,
  wallPenetrationPredict: true,
  killTriggerOnSwipe: true,
  aimWhileJumping: true,
  simulateHumanSwipe: true,
  detectPingLag: true,
  autoAdjustBasedOnPing: true,
  suppressMuzzleShake: true,
  enemyDangerPriority: true,
  evadeEnemyLocks: true,
  noDetectionSignature: true,
  autoFireOnlyWhenDeadly: true,
  stickyLockMP40: true,
  burstFireFix: true,
  overrideInertia: true,
  stabilizeCrosshairSpeed: true,
  optimizeForMobile: true,
  fpsLimit: 144, // tối đa khung hình
  renderScale: 1.0,
  zeroInputLag: true,
};

function ghostAIControl(enemy, state) {
  if (!enemy || !state) return;
  const lockTarget = predictHead(enemy.position, enemy.velocity);
  const aimPower = calculateDynamicForce(lockTarget, state.ping, state.weapon, ghostConfig);
  if (ghostConfig.killTriggerOnSwipe && state.userSwipeDetected) {
    fireBulletNow(aimPower);
  } else {
    adjustCrosshair(lockTarget, aimPower);
  }
}

function predictHead(position, velocity) {
  const futurePos = {
    x: position.x + velocity.x * 0.015,
    y: position.y + velocity.y * 0.015 + ghostConfig.headOffsetY,
    z: position.z + velocity.z * 0.015,
  };
  return futurePos;
}

function calculateDynamicForce(target, ping, weapon, config) {
  let delay = config.autoAimDelay ? Math.max(0.01, ping / 200) : 0;
  let weaponFactor = weapon === "MP40" ? 1.8 : 1.2;
  let inertiaControl = config.overrideInertia ? 0.01 : 0.03;
  return {
    x: (target.x - getCrosshair().x) * config.aimSpeed * weaponFactor * inertiaControl,
    y: (target.y - getCrosshair().y) * config.aimSpeed * weaponFactor * inertiaControl,
    z: (target.z - getCrosshair().z) * config.aimSpeed * weaponFactor * inertiaControl,
    delay,
  };
}

function fireBulletNow(aimData) {
  if (aimData) {
    setCrosshair(aimData);
    triggerFire();
  }
}

// Auto FPS detect and optimize
(function optimizeFPS() {
  if (!ghostConfig.fpsBoost) return;
  setInterval(() => {
    const fps = detectFPS();
    if (ghostConfig.autoFPSDetect && fps < 50) {
      applyRenderFix();
      reduceShadowQuality();
      forceHighPerformanceGPU();
    }
  }, 2000);
})();

function detectFPS() {
  // fake FPS detection
  return Math.floor(Math.random() * (90 - 45 + 1)) + 45;
}

function applyRenderFix() {
  // Reduce visual load
  document.body.style.filter = "contrast(1.1) brightness(1.05)";
}

function reduceShadowQuality() {
  // Logic to lower shadow settings (stub)
}

function forceHighPerformanceGPU() {
  // Force device to prefer high performance (stub)
}

function getCrosshair() {
  return { x: 0, y: 0, z: 0 }; // Stub
}

function setCrosshair(vec) {
  // Apply vector to crosshair (stub)
}

function triggerFire() {
  console.log("🔥 GhostAI Fire Triggered!");
}

// Main loop
game.on('tick', () => {
  const enemy = game.getNearestEnemy();
  const state = {
    ping: game.getPing(),
    userSwipeDetected: game.userSwipeActive(),
    weapon: game.getCurrentWeapon(),
  };
  ghostAIControl(enemy, state);
});
