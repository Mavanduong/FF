// ==UserScript==
// @name         AutoHeadlockProMax v13.0-GodBurstX1000
// @version      13.0
// @description  Ghim đầu max lực – Không trượt – Ưu tiên burst vào đầu – Anti lệch – Lock cực nhanh
// ==/UserScript==

const aimSystem = {
  headRatio: 0.98, // Ưu tiên vùng đầu gần tuyệt đối
  neckRedirect: true, // Nếu lệch cổ → auto đẩy lên đầu
  burstControl: true,
  burstRate: 6, // Bắn 3 viên → reset lock
  aimSpeed: 9999, // Max tốc độ lock
  stickyPower: 999, // Độ dính mục tiêu
  predictionPower: 1.6, // Dự đoán vị trí di chuyển
  recoilCompensation: true,
  recoilFactor: 0, // Không lệch
  humanSwipeDelay: 8, // Delay xử lý vuốt để hợp lý hơn
  squadLock: true,
  squadLockPriority: 'closest+danger', // Ưu tiên địch gần và nguy hiểm
  maxDistance: 200,
  aimUpdateRate: 1, // Mỗi tick
  bulletSpeedBoost: true,
  quantumFollow: true,
  wallBypass: true,
};

let fireBurstCount = 0;

game.on('tick', () => {
  const enemy = game.findTarget({
    priority: aimSystem.squadLockPriority,
    range: aimSystem.maxDistance,
    visibility: !aimSystem.wallBypass ? 'visible' : 'any',
  });

  if (!enemy) return;

  const targetPos = enemy.getPredictedHead(aimSystem.predictionPower);

  // Neck redirect logic
  if (aimSystem.neckRedirect) {
    let offsetY = targetPos.y - game.player.aim.y;
    if (offsetY > 0.2 && offsetY < 0.5) {
      targetPos.y -= offsetY * 0.95; // Kéo gần lên đầu
    }
  }

  // Apply no spread logic
  if (aimSystem.recoilCompensation) {
    game.player.spread = 0;
  }

  // Update aim
  game.player.aim = game.player.aim.lerp(targetPos, aimSystem.aimSpeed);

  // Sticky Lock
  if (aimSystem.stickyPower > 0) {
    game.lockOn(enemy, aimSystem.stickyPower);
  }

  // Burst Fire Logic
  if (aimSystem.burstControl && game.player.isFiring) {
    fireBurstCount++;
    if (fireBurstCount >= aimSystem.burstRate) {
      fireBurstCount = 0;
      game.retarget(enemy); // Reset lock để lock lại mạnh hơn
    }
  }

  // Human swipe delay
  if (aimSystem.humanSwipeDelay > 0 && game.player.isSwiping) {
    game.delayAimUpdate(aimSystem.humanSwipeDelay);
  }

  // Bullet Speed Hack (Fake logic)
  if (aimSystem.bulletSpeedBoost) {
    game.bulletSpeed = 999999;
  }

  // Head Lock Quantum Track
  if (aimSystem.quantumFollow) {
    let d = enemy.getHeadPosition();
    game.player.aim.x += (d.x - game.player.aim.x) * 1.5;
    game.player.aim.y += (d.y - game.player.aim.y) * 1.5;
  }
});
