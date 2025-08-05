// ==UserScript==
// @name         AutoHeadlockProMax v6.0 Ultra Lock
// @version      6.0
// @description  Vuốt là chết, khóa đầu trong 1 frame. Không chệch, không auto, không delay.
// ==/UserScript==

console.log("🔫 AutoHeadlockProMax v6.0 ULTRA LOCK READY");

let isTriggerHeld = false;

const lockThreshold = 0.9992;
const smoothing = 0.05;

function getHead(target) {
  return getBonePosition(target, 8);
}

function normalize(vec) {
  const mag = Math.sqrt(vec.x**2 + vec.y**2 + vec.z**2);
  return { x: vec.x / mag, y: vec.y / mag, z: vec.z / mag };
}

function aimAtHead(target) {
  const myPos = getPlayerPosition();
  const head = getHead(target);
  const dir = normalize({
    x: head.x - myPos.x,
    y: head.y - myPos.y,
    z: head.z - myPos.z
  });
  moveCrosshair({
    x: dir.x * (1 - smoothing),
    y: dir.y * (1 - smoothing),
    z: dir.z * (1 - smoothing)
  });
}

function findTarget() {
  const enemies = getNearbyEnemies();
  for (const enemy of enemies) {
    if (!enemy.visible || !enemy.headVisible) continue;
    if (isCrosshairNear(getHead(enemy), lockThreshold)) {
      return enemy;
    }
  }
  return null;
}

function onFireKeyDown() {
  isTriggerHeld = true;
}
function onFireKeyUp() {
  isTriggerHeld = false;
}

function gameLoop() {
  if (!isTriggerHeld) return;
  const target = findTarget();
  if (target) aimAtHead(target);
}

setInterval(gameLoop, 16);
bindFireKey(onFireKeyDown, onFireKeyUp);
