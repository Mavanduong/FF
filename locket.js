// ==UserScript==
// @name         AutoHeadlockProMax v4.4.0 - UltraLock SwipeForce
// @version      4.4.0
// @description  Vuốt kiểu gì cũng lock đầu - Vuốt lệch đầu thì bắn - Snap cực mạnh nhưng vẫn tự nhiên
// ==/UserScript==

console.log("🔒 AutoHeadlockProMax v4.4.0 - UltraLock SwipeForce ENABLED");

const HEAD_RADIUS = 0.25;
const LOCK_DISTANCE = 0.9;
const HUMAN_OFFSET = 0.03;
const aimSnapStrength = 1.35;

function distance3D(a, b) {
  return Math.sqrt((a.x - b.x)**2 + (a.y - b.y)**2 + (a.z - b.z)**2);
}

function aimTo(target, player, offset = {x:0,y:0,z:0}) {
  return {
    x: (target.x + offset.x - player.x) * aimSnapStrength,
    y: (target.y + offset.y - player.y) * aimSnapStrength,
    z: (target.z + offset.z - player.z) * aimSnapStrength
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
  const deltaY = swipeVector.y;
  const closeToHead = distance3D(currentAim, headPos) <= HEAD_RADIUS;
  return closeToHead && deltaY > 0.01;
}

function fireWithDelay(player) {
  const delay = 20 + Math.random() * 40;
  setTimeout(() => player.fire(), delay);
}

game.on("tick", () => {
  const enemies = game.getEnemies();
  const player = game.getPlayer();
  const aim = player.getAim();
  const swipe = player.getSwipe(); // Vuốt hiện tại {x,y,z}
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
  const offset = simulateHumanOffset();
  const aimVector = aimTo(head, player, offset);
  const isClose = isNearHead(aim, head);

  // Nếu đang ghim đầu mà vuốt lên → không cho lệch, giữ lại
  if (aim.y - head.y > HEAD_RADIUS) {
    aimVector.y = 0; // reset vuốt lên
  }

  // Nếu đang trong khoảng ghim đầu
  if (isClose) {
    player.setAim(aimVector);
    if (shouldAutoFire(aim, head, swipe)) {
      fireWithDelay(player);
    }
  } else {
    // Vuốt kiểu gì cũng tự snap vào đầu
    player.setAim(aimVector);
  }
});
