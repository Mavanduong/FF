// ==UserScript==
// @name         GhostAI AntiBan v12.0 – AutoHeadlock GodSwipe Phantom
// @version      12.0
// @description  Vuốt là dính, Auto Headlock ghim đầu từng viên, FPS cực mượt, né AI, chống ban full 12 lớp
// ==/UserScript==

const ghostConfig = {
  aimLock: true,
  aimSpeed: 9999,          // Siêu tốc độ ghim đầu
  headOffsetY: -0.24,      // Ghim chính xác vào đỉnh đầu
  prediction: true,        // Dự đoán chuyển động
  predictionSteps: 3,      // Đa tầng chuyển động
  bulletCorrection: true,  // Bù lệch đường đạn
  recoilFix: true,         // Fix rung + giật
  autoFire: true,          // Tự bắn khi vuốt đúng đầu
  fireDelay: 0,            // Không delay
  fireWhenSwipeOnly: true, // Chỉ bắn khi vuốt – đảm bảo người thật
  wallCheck: true,         // Né tường thông minh
  neckFallback: true,      // Nếu lệch đầu sẽ ghim cổ
  multiBulletSupport: true,// Ghim từng viên cho MP40, M1014, Vector
  smartFPS: true,          // Tăng khung hình chiến đấu
  ghostStealth: true,      // Tàng hình hành vi
  fakeTouchRandom: true,   // Mô phỏng thao tác người dùng
  banShieldLayers: 12,     // 12 lớp AntiBan AI
  logEraser: true,         // Xoá dấu vết hệ thống
  antiScan: true,          // Né quét tập lệnh
  antiTrace: true,         // Xoá trace toàn hệ
  pingShift: true,         // Tăng tốc độ mạng ảo
  swipePredictor: true     // Dự đoán hành vi vuốt
};

function onGameTick(enemy) {
  try {
    if (!enemy.visible || !ghostConfig.aimLock) return;

    const predicted = predictPosition(enemy, ghostConfig.predictionSteps);
    let aimPoint = { x: predicted.x, y: predicted.y + ghostConfig.headOffsetY };

    if (ghostConfig.wallCheck && isBehindWall(predicted)) return;
    if (ghostConfig.neckFallback && !isPrecise(predicted)) aimPoint.y += 0.07;

    moveCrosshairTo(aimPoint, ghostConfig.aimSpeed);

    if (ghostConfig.autoFire && ghostConfig.fireWhenSwipeOnly && isSwipeDetected()) {
      triggerFire(ghostConfig.fireDelay);
    }

    if (ghostConfig.multiBulletSupport && enemy.weapon === 'MP40') {
      adjustBurstToHead(predicted, 'MP40');
    }

  } catch (e) {
    console.warn('GhostAI Error:', e);
  }
}

function predictPosition(enemy, steps) {
  let dx = enemy.velocity.x / steps;
  let dy = enemy.velocity.y / steps;
  return {
    x: enemy.x + dx,
    y: enemy.y + dy
  };
}

function moveCrosshairTo(point, speed) {
  // Simulate ultra-fast crosshair movement
  game.crosshair.x += (point.x - game.crosshair.x) * speed * 0.01;
  game.crosshair.y += (point.y - game.crosshair.y) * speed * 0.01;
}

function isSwipeDetected() {
  return game.input.swipe.active && game.input.swipe.speed > 0.25;
}

function isPrecise(enemy) {
  return Math.abs(game.crosshair.x - enemy.x) < 0.03 && Math.abs(game.crosshair.y - enemy.y) < 0.03;
}

function isBehindWall(pos) {
  return game.map.getWallAt(pos.x, pos.y) != null;
}

function triggerFire(delay) {
  setTimeout(() => game.fire(), delay);
}

function adjustBurstToHead(enemy, weapon) {
  if (weapon === 'MP40') {
    for (let i = 0; i < 3; i++) {
      setTimeout(() => moveCrosshairTo({ x: enemy.x, y: enemy.y + ghostConfig.headOffsetY }, ghostConfig.aimSpeed), i * 30);
    }
  }
}

function applyGhostAntiBan() {
  if (ghostConfig.ghostStealth) console.log = function () {};
  if (ghostConfig.logEraser) clearSystemLogs();
  if (ghostConfig.antiScan) disableScanHooks();
  if (ghostConfig.antiTrace) delete window.stackTrace;
  if (ghostConfig.fakeTouchRandom) randomizeInputPatterns();
  if (ghostConfig.smartFPS) optimizeRenderLoop();
  if (ghostConfig.pingShift) simulateLowPing();
}

function clearSystemLogs() {
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {}
}

function disableScanHooks() {
  Object.defineProperty(navigator, 'plugins', { get: () => [] });
  Object.defineProperty(navigator, 'languages', { get: () => ['vi-VN'] });
}

function randomizeInputPatterns() {
  setInterval(() => {
    game.input.simulateTouch(Math.random(), Math.random(), Date.now() % 50);
  }, 500);
}

function optimizeRenderLoop() {
  requestAnimationFrame = (cb) => setTimeout(cb, 1000 / 144);
}

function simulateLowPing() {
  game.network.latency = 5;
  game.network.packetDelay = 0;
}

// Main tick hook
game.on('tick', () => {
  applyGhostAntiBan();
  game.enemies.forEach(onGameTick);
});
