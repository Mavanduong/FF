// ==UserScript==
// @name         AutoHeadlockProMax v12.5-FinalSquadGod
// @version      12.5
// @description  Ghim đầu tuyệt đối – Tăng tốc xử lý – Bypass nhiệt – Lock ưu tiên squad – Không thua bot
// ==/UserScript==

const config = {
  aimPower: 9999,
  aimSpeed: 99999,
  maxDistance: 200,
  stickyLockRange: 3.0,
  predictionFactor: 1.75,
  bulletSpeed: 9999,
  recoilBypass: true,
  humanSwipeDelay: 22,
  heatBypass: true,
  fireCompensate: true,
  squadPriority: true
};

let bulletsFired = 0;

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function getTargetHead(target) {
  return {
    x: target.x,
    y: target.y - target.height * 0.9 // Luôn lấy vị trí đầu
  };
}

function calculateAim(player, target) {
  const head = getTargetHead(target);
  let dx = head.x - player.x;
  let dy = head.y - player.y;

  // Bypass recoil spread do heat
  if (config.heatBypass) {
    const heat = Math.min(1, bulletsFired / 30);
    const spread = 0; // Set về 0 nếu muốn 100% không lệch
    dx += random(-spread, spread);
    dy += random(-spread, spread);
  }

  // Dự đoán địch di chuyển
  dx += target.vx * config.predictionFactor;
  dy += target.vy * config.predictionFactor;

  return {
    x: dx * config.aimSpeed,
    y: dy * config.aimSpeed
  };
}

function selectTarget(enemies, player) {
  let selected = null;
  let minScore = Infinity;

  for (const enemy of enemies) {
    if (!enemy.alive || enemy.distance > config.maxDistance) continue;

    let score = enemy.distance;

    if (config.squadPriority) {
      if (enemy.weapon === 'shotgun') score -= 15;
      if (enemy.hp < 30) score -= 10;
      if (enemy.isAimingAt(player)) score -= 20;
    }

    if (score < minScore) {
      minScore = score;
      selected = enemy;
    }
  }

  return selected;
}

function aimAndFire(player, enemies) {
  const target = selectTarget(enemies, player);
  if (!target) return;

  const aim = calculateAim(player, target);
  player.aim(aim.x, aim.y);

  if (player.isFiring) {
    bulletsFired++;
    if (config.fireCompensate) player.shotSpread = 0; // Hút về đầu
    if (config.recoilBypass) player.recoil = 0;
  } else {
    bulletsFired = 0;
  }
}

// Tick theo từng frame
game.on('tick', () => {
  aimAndFire(game.player, game.enemies);
});
