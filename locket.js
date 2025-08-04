// ==UserScript==
// @name         AutoHeadlockProMax v4.3 GigaGodMode
// @version      4.3.0
// @description  Ghim đầu cưỡng bức, vuốt nhẹ vẫn bám, burst đa đạn, né AI chính xác hơn
// ==/UserScript==

console.log("🎯 AutoHeadlockProMax v4.3 GigaGodMode ACTIVATED");

let target = null;
let isFiring = false;
let lockThreshold = 0.995;
let softLockThreshold = 0.97;
let bodyLockThreshold = 0.88;
let burstDelay = 50;
let consecutiveHeadshots = 0;
let bodyLockFrames = 0;

function getHeadPosition(target) {
  return getBonePosition(target, 8); // Bone 8 = head
}

function getBodyPosition(target) {
  return getBonePosition(target, 3); // Bone 3 = chest
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
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

  if (dist < 2.5) {
    const correction = normalize({ x: dx, y: dy, z: dz });
    moveCrosshair({
      x: correction.x * 0.9,
      y: correction.y * 0.9,
      z: correction.z * 0.9
    });
  }
}

function elevateIfBodyLocked(target) {
  if (isBodyLocked(target) && !isHeadLocked(target)) {
    const head = getHeadPosition(target);
    const body = getBodyPosition(target);
    const lift = {
      x: head.x - body.x,
      y: head.y - body.y,
      z: head.z - body.z
    };
    const upVec = normalize(lift);
    moveCrosshair({
      x: upVec.x * 0.55,
      y: upVec.y * 0.55,
      z: upVec.z * 0.55
    });
  }
}

function elevateIfStuckOnBody(target) {
  if (isBodyLocked(target) && !isHeadLocked(target)) {
    bodyLockFrames++;
    if (bodyLockFrames > 5) {
      aimAtHead(target, 1.0);
      moveCrosshair({ x: 0, y: 0, z: 0.01 });
    }
  } else {
    bodyLockFrames = 0;
  }
}

function findBestTarget() {
  const enemies = getNearbyEnemies();
  let best = null;
  let bestScore = -Infinity;

  for (const enemy of enemies) {
    if (!enemy.visible) continue;
    const head = getHeadPosition(enemy);
    const distance = distance3D(getPlayerPosition(), head);
    const exposure = enemy.headVisible ? 1 : 0.3; // Nếu đầu lộ thì ưu tiên hơn
    const score = (exposure * 1.5) - distance;
    if (score > bestScore) {
      bestScore = score;
      best = enemy;
    }
  }

  return best;
}

function gameLoop() {
  target = findBestTarget();
  if (!target) return;

  correctAimDrift(target);
  aimAtHead(target, 0.6);
  elevateIfBodyLocked(target);
  elevateIfStuckOnBody(target);

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
