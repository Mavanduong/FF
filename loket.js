// ==UserScript==
// @name         AutoBodyLockProMax v2.0-InstantLock
// @version      2.0
// @description  Ghim ngay lập tức vào thân – Không kéo, không lệch
// ==/UserScript==

const config = {
  maxDistance: 150,
  targetZone: "body", // Ghim vào thân
  autoScope: true,
};
requestAnimationFrame(loop);
function loop() {
  try {
    // logic aim ở đây
  } catch(e) {}
  requestAnimationFrame(loop);
}


let state = {
  lockedTarget: null,
  bulletsFired: 0,
};

// Lấy tọa độ chính giữa thân (ngực)
function getBodyPosition(target) {
  return {
    x: target.x,
    y: target.y - (target.height * 0.5),
  };
}

function aimInstant(target) {
  let body = getBodyPosition(target);

  // Đặt aim ngay lập tức vào thân, không kéo
  player.aim.x = body.x;
  player.aim.y = body.y;
}

game.on("tick", () => {
  let enemies = game.getEnemies();

  for (let enemy of enemies) {
    if (!enemy.isVisible || enemy.health <= 0) continue;

    let distance = getDistance(player, enemy);
    if (distance > config.maxDistance) continue;

    state.lockedTarget = enemy;
    aimInstant(enemy);
    break; // Ghim thằng đầu tiên tìm thấy
  }
});

game.on("fire", () => {
  state.bulletsFired += 1;
});

game.on("reload", () => {
  state.bulletsFired = 0;
});

function getDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
