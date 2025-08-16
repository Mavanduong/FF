// ==UserScript==
// @name         AutoHeadlockProMax v12.3-SquadGodX
// @version      12.3
// @description  Ghim đầu cực đại – Không lệch thân – Không lệch chân – Ưu tiên đầu mọi trường hợp
// ==/UserScript==

const config = {
  aimSpeed: 9999,
  maxDistance: 150,
  headLockForce: Infinity,
  bodyIgnore: true,
  stickyZone: "head",
  prediction: true,
  dynamicCorrection: true,
  autoScope: true,
  ignoreHeatSpread: true,
};

let state = {
  lockedTarget: null,
  bulletsFired: 0,
};

function getHeadPosition(target) {
  return {
    x: target.x,
    y: target.y - (target.height * 0.9), // Ghim chính giữa đầu
  };
}

function shouldIgnoreBody(targetPoint, enemy) {
  const headTop = enemy.y - enemy.height;
  const headBottom = enemy.y - enemy.height * 0.1;
  return !(targetPoint.y >= headTop && targetPoint.y <= headBottom);
}

function aimAt(target) {
  let head = getHeadPosition(target);

  // Tính lệch do nòng nóng
  let heat = Math.min(1, state.bulletsFired / 30);
  let spread = config.ignoreHeatSpread ? 0 : (0.5 * heat);

  let aim = {
    x: head.x + random(-spread, spread),
    y: head.y + random(-spread, spread),
  };

  // Kiểm tra lệch > 1cm thì tự động kéo lại
  let distFromHead = Math.hypot(aim.x - head.x, aim.y - head.y);
  if (distFromHead > 1) {
    aim.x = head.x;
    aim.y = head.y;
  }

  // Bỏ qua nếu lệch xuống thân/dưới thân
  if (config.bodyIgnore && shouldIgnoreBody(aim, target)) return;

  moveAimTo(aim.x, aim.y, config.aimSpeed);
}

game.on("tick", () => {
  let enemies = game.getEnemies();

  for (let enemy of enemies) {
    if (!enemy.isVisible || enemy.health <= 0) continue;

    let distance = getDistance(player, enemy);
    if (distance > config.maxDistance) continue;

    state.lockedTarget = enemy;
    aimAt(enemy);
    break;
  }
});

game.on("fire", () => {
  state.bulletsFired += 1;
});

game.on("reload", () => {
  state.bulletsFired = 0;
});

function moveAimTo(x, y, speed) {
  // Di chuyển tâm cực nhanh đến tọa độ chỉ định
  player.aim.x += (x - player.aim.x) / speed;
  player.aim.y += (y - player.aim.y) / speed;
}

function getDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function random(min, max) {
  return Math.random() * (max - min) + min;
}

