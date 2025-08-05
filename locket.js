// ==UserScript==
// @name         AutoHeadlockProMax v4.3.9-GigaGodMode
// @version      4.3.9
// @description  Vuốt chỉnh về đầu - nếu đang đúng đầu mà cố kéo → bắn luôn
// ==/UserScript==

console.log("🎯 AutoHeadlockProMax v4.3.9-GigaGodMode ACTIVATED");

const HEAD_RADIUS = 0.25; // bán kính vùng đầu
const LOCK_DISTANCE = 0.5; // ghim đầu nếu cách dưới 0.5m
const HUMAN_OFFSET = 0.03; // mô phỏng vuốt người thật (±3%)

function distance3D(a, b) {
  return Math.sqrt((a.x - b.x)**2 + (a.y - b.y)**2 + (a.z - b.z)**2);
}

function aimTo(target, player, offset = {x:0,y:0,z:0}) {
  return {
    x: target.x + offset.x - player.x,
    y: target.y + offset.y - player.y,
    z: target.z + offset.z - player.z,
  };
}

function isNearHead(playerAim, headPos) {
  return distance3D(playerAim, headPos) < LOCK_DISTANCE;
}

function simulateHumanOffset() {
  return {
    x: (Math.random() - 0.5) * HUMAN_OFFSET,
    y: (Math.random() - 0.5) * HUMAN_OFFSET,
    z: 0
  };
}

function shouldAutoFire(currentAim, headPos, swipeVector) {
  // Nếu đang gần đầu và người chơi vuốt thêm lên trên → bắn luôn
  const deltaY = swipeVector.y;
  const closeToHead = distance3D(currentAim, headPos) <= HEAD_RADIUS;
  return closeToHead && deltaY > 0.01;
}

game.on("tick", () => {
  const enemies = game.getEnemies();
  const player = game.getPlayer();
  const aim = player.getAim();
  const swipe = player.getSwipe(); // {x,y,z} vuốt hiện tại
  if (!enemies || enemies.length === 0) return;

  let bestTarget = null;
  let bestDistance = Infinity;

  for (let enemy of enemies) {
    const head = enemy.getBone("head");
    const dist = distance3D(player, head);
    if (dist < bestDistance) {
      bestTarget = enemy;
      bestDistance = dist;
    }
  }

  if (!bestTarget) return;

  const head = bestTarget.getBone("head");
  const isClose = isNearHead(aim, head);
  const offset = simulateHumanOffset();

  // Trường hợp vuốt lên quá đầu → kéo nhẹ xuống lại
  let adjust = {x: 0, y: 0, z: 0};
  if (aim.y - head.y > HEAD_RADIUS) {
    adjust.y = -0.02; // kéo nhẹ xuống
  }

  // Ghim đầu nếu trong khoảng 0.5m
  if (isClose) {
    player.setAim(aimTo(head, player, offset));
    if (shouldAutoFire(aim, head, swipe)) {
      player.fire();
    }
  } else {
    // Nếu vuốt bất kỳ kiểu gì → auto gom lại đúng đầu
    player.setAim(aimTo(head, player, {...offset, ...adjust}));
  }
});
