// ==UserScript==
// @name         AutoHeadlockProMax v4.2 UltraPrecision-GigaGodMode
// @version      4.2
// @description  Ghim đầu siêu chính xác + Bắn tự động 5 viên + Né tâm + Trajectory fix
// ==/UserScript==

console.log("🎯 AutoHeadlockProMax v4.2 UltraPrecision ACTIVATED");

let isFiring = false;
let lockThreshold = 0.985;
let target = null;

function getHeadPosition(tgt) {
  return getBonePosition(tgt, 8);
}

function distance3D(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function normalize(vec) {
  let mag = Math.sqrt(vec.x ** 2 + vec.y ** 2 + vec.z ** 2);
  return { x: vec.x / mag, y: vec.y / mag, z: vec.z / mag };
}

function aimAt(headPos, myPos) {
  const dir = normalize({ x: headPos.x - myPos.x, y: headPos.y - myPos.y, z: headPos.z - myPos.z });
  moveCrosshair(dir);
}

function stickyAimAdjust(target) {
  const predicted = predictMovement(target);
  aimAt(predicted, getPlayerPosition());
}

function predictMovement(target) {
  const head = getHeadPosition(target);
  const vel = target.velocity || { x: 0, y: 0, z: 0 };
  const predictionFactor = 0.08;
  return {
    x: head.x + vel.x * predictionFactor,
    y: head.y + vel.y * predictionFactor,
    z: head.z + vel.z * predictionFactor
  };
}

function isLockedOn(target) {
  const head = getHeadPosition(target);
  return isCrosshairNear(head, lockThreshold);
}

function fireBurst(count = 5, delay = 45) {
  isFiring = true;
  let shotsLeft = count;

  function nextShot() {
    if (shotsLeft <= 0) {
      isFiring = false;
      return;
    }
    fire();
    shotsLeft--;
    setTimeout(nextShot, delay);
  }

  nextShot();
}

function dodgeLockIfAimed() {
  const enemies = getNearbyEnemies();
  for (const enemy of enemies) {
    if (enemy.isAimingAtMe) {
      const dir = Math.random() > 0.5 ? "left" : "right";
      dodge(dir);
    }
  }
}

function gameLoop() {
  target = findBestTarget();
  if (!target) return;

  stickyAimAdjust(target);

  if (isLockedOn(target) && !isFiring) {
    fire();
    fireBurst(5); // Bắn thêm 5 viên ngay lập tức
  }

  dodgeLockIfAimed();
}

setInterval(gameLoop, 16);
