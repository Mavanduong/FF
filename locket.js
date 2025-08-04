// ==UserScript==
// @name         AutoHeadlockProMax v4.2.2 GigaGodMode
// @version      4.2.2
// @description  Dính người tự kéo lên đầu, vuốt nhẹ vẫn ghim, né AI, burst đa đạn
// ==/UserScript==

console.log("🎯 AutoHeadlockProMax v4.2.2 GigaGodMode ACTIVATED");

let target = null;
let isFiring = false;
let lockThreshold = 0.985;
let softLockThreshold = 0.93;
let bodyLockThreshold = 0.88; // Khi tâm đang dính người
let burstDelay = 50;
let consecutiveHeadshots = 0;

function getHeadPosition(target) {
  return getBonePosition(target, 8); // bone 8 = head
}

function getBodyPosition(target) {
  return getBonePosition(target, 3); // bone 3 = ngực/bụng
}

function distance3D(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

function normalize(vec) {
  const mag = Math.sqrt(vec.x ** 2 + vec.y ** 2 + vec.z ** 2);
  return { x: vec.x / mag, y: vec.y / mag, z: vec.z / mag };
}

function moveSmoothTo(vec, smoothing = 0.7) {
  moveCrosshair({
    x: vec.x * smoothing,
    y: vec.y * smoothing,
    z: vec.z * smoothing
  });
}

function aimAtHead(target, smoothing = 0.7) {
  const headPos = getHeadPosition(target);
  const myPos = getPlayerPosition();
  const aimVec = normalize({
    x: headPos.x - myPos.x,
    y: headPos.y - myPos.y,
    z: headPos.z - myPos.z
  });
  moveSmoothTo(aimVec, smoothing);
}

function isHeadLocked(target, threshold = lockThreshold) {
  return isCrosshairNear(getHeadPosition(target), threshold);
}

function isBodyLocked(target) {
  return isCrosshairNear(getBodyPosition(target), bodyLockThreshold);
}

function autoBurstFire(count) {
  isFiring = true;
  let shots = 0;
  function burst() {
    if (shots >= count) {
      isFiring = false;
      return;
    }
    fire();
    shots++;
    setTimeout(burst, burstDelay);
  }
  burst();
}

function simulateAvoidEnemyAim() {
  const threats = getNearbyEnemies();
  for (let enemy of threats) {
    if (enemy.isAimingAtMe) {
      if (Math.random() > 0.5) {
        dodgeLeftOrRight();
      } else {
        jumpOrCrouch();
      }
    }
  }
}

function correctAimDrift(target) {
  const head = getHeadPosition(target);
  const my = getPlayerPosition();
  const dx = head.x - my.x;
  const dy = head.y - my.y;
  const dz = head.z - my.z;
  const correction = normalize({ x: dx * 1.05, y: dy * 1.05, z: dz * 1.02 });
  moveCrosshair(correction);
}

function elevateIfBodyLocked(target) {
  if (isBodyLocked(target) && !isHeadLocked(target)) {
    const head = getHeadPosition(target);
    const body = getBodyPosition(target);
    const lift = {
      x: (head.x - body.x),
      y: (head.y - body.y),
      z: (head.z - body.z)
    };
    const upVec = normalize(lift);
    moveCrosshair({ x: upVec.x * 0.4, y: upVec.y * 0.4, z: upVec.z * 0.4 }); // Kéo lên nhẹ
  }
}

function gameLoop() {
  target = findBestTarget();
  if (!target) return;

  correctAimDrift(target);
  aimAtHead(target, 0.6); // Hỗ trợ nhẹ

  elevateIfBodyLocked(target); // <== Tâm dính người, tự kéo lên đầu

  const softLocked = isHeadLocked(target, softLockThreshold);
  const fullyLocked = isHeadLocked(target, lockThreshold);

  if ((softLocked || fullyLocked) && !isFiring) {
    consecutiveHeadshots++;
    fire();
    const extraShots = 3 + Math.floor(Math.random() * 3);
    autoBurstFire(extraShots);
  } else {
    consecutiveHeadshots = 0;
  }

  simulateAvoidEnemyAim();
}

setInterval(gameLoop, 16);
