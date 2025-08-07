// ==UserScript==
// @name         AutoHeadlockProMax v12.0-FullLock_AIOverheatFix
// @version      12.0
// @description  Ghim đầu cực mạnh – Vuốt sai lệch vẫn tự sửa – Tâm kéo nhanh – Giảm lệch do nóng nòng – Không lệch cổ – FullSafe
// ==/UserScript==

const config = {
  aimSpeed: 6000, // Siêu nhanh, di theo đầu ngay lập tức
  predictionFactor: 1.35, // Dự đoán đường chạy của đầu
  stickyLock: true,
  maxDistance: 150, // Phạm vi auto-lock
  headCorrection: true,
  recoilDecay: 0.5, // Giảm độ lệch xuống 50%
  overheatFix: true,
  lockPriority: ['head', 'upperChest'],
  smartCorrectionThreshold: 0.15, // Nếu lệch < 15%, tự sửa tâm vào đầu
  enableSwipeAssist: true,
  antiBan: true
};

// 🔁 Overheat logic – giảm độ lệch theo số viên bắn ra
let heatLevel = 0;

function onBulletFired() {
  heatLevel += 1;
  if (heatLevel > 10) heatLevel = 10;
  config.recoilDecay = 1 - (heatLevel / 20); // Giảm độ lệch dần
}

function onGameTick(player, enemies) {
  if (!player || enemies.length === 0) return;

  const targets = enemies
    .filter(e => e.isVisible && e.distance <= config.maxDistance)
    .map(e => {
      const headPos = predictHead(e);
      const dist = distance(player.crosshair, headPos);
      return { enemy: e, headPos, dist };
    })
    .sort((a, b) => a.dist - b.dist);

  if (targets.length === 0) return;

  const target = targets[0];
  const angleOffset = calculateOffset(player.crosshair, target.headPos);

  // Nếu lệch nhỏ, tự sửa vào đầu
  if (Math.abs(angleOffset.x) < config.smartCorrectionThreshold &&
      Math.abs(angleOffset.y) < config.smartCorrectionThreshold) {
    moveCrosshair(player, target.headPos, config.aimSpeed);
  } else if (config.enableSwipeAssist && isSwiping(player)) {
    // Vuốt sai lệch? Tự điều chỉnh lại
    moveCrosshair(player, target.headPos, config.aimSpeed * 0.8);
  }

  if (isFiring(player)) {
    onBulletFired();
  }
}

function predictHead(enemy) {
  const predictX = enemy.head.x + enemy.velocity.x * config.predictionFactor;
  const predictY = enemy.head.y + enemy.velocity.y * config.predictionFactor;
  return { x: predictX, y: predictY };
}

function distance(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function calculateOffset(from, to) {
  return { x: to.x - from.x, y: to.y - from.y };
}

function moveCrosshair(player, target, speed) {
  player.crosshair.x += (target.x - player.crosshair.x) * speed / 10000;
  player.crosshair.y += (target.y - player.crosshair.y) * speed / 10000;
}

function isSwiping(player) {
  return Math.abs(player.swipe.x) > 0.1 || Math.abs(player.swipe.y) > 0.1;
}

function isFiring(player) {
  return player.isShooting || player.autoFire;
}

game.on('tick', () => {
  onGameTick(game.player, game.enemies);
});
