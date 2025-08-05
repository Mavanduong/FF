
// ==UserScript==
// @name         AutoHeadlockProMax v6.5 Anti-AimAssist
// @version      6.5
// @description  Vuốt là chết. Chống hút tâm body. Ghim đầu ngay cả khi bị game kéo lệch.
// ==/UserScript==

console.log("🎯 AutoHeadlockProMax v6.5 - Anti-AimAssist Loaded");

let isAiming = false;
const LOCK_ZONE = 0.9985;
const FORCE_HEAD_RATE = 2; // số lần override mỗi giây

function getHeadPos(enemy) {
  return getBonePosition(enemy, 8);
}

function isNearHead(enemy) {
  const head = getHeadPos(enemy);
  return isCrosshairNear(head, LOCK_ZONE);
}

function forceAimHead(enemy) {
  const player = getPlayerPosition();
  const head = getHeadPos(enemy);
  const dir = {
    x: head.x - player.x,
    y: head.y - player.y,
    z: head.z - player.z
  };
  const mag = Math.sqrt(dir.x**2 + dir.y**2 + dir.z**2);
  moveCrosshair({
    x: dir.x / mag,
    y: dir.y / mag,
    z: dir.z / mag
  });
}

function getTargetEnemy() {
  const list = getNearbyEnemies();
  for (let e of list) {
    if (e.visible && e.headVisible && isNearHead(e)) return e;
  }
  return null;
}

function onPressShoot() {
  isAiming = true;
}
function onReleaseShoot() {
  isAiming = false;
}

setInterval(() => {
  if (!isAiming) return;
  const target = getTargetEnemy();
  if (target) {
    forceAimHead(target); // Override lần 1
    setTimeout(() => forceAimHead(target), 5);  // Override lần 2 – phản hút
  }
}, 1000 / FORCE_HEAD_RATE);

bindFireKey(onPressShoot, onReleaseShoot);
