// ==UserScript==
// @name         AutoHeadlockProMax v4.2 GigaGodMode
// @version      4.2
// @description  Ghim đầu max lực + Bắn bám đầu + Né lock AI + Dự đoán đường đạn
// ==/UserScript==

console.log("🎯 AutoHeadlockProMax v4.2 GigaGodMode ACTIVATED");

let target = null;
let isFiring = false;
let lockThreshold = 0.985;
let burstDelay = 50;
let consecutiveHeadshots = 0;

function getHeadPosition(target) {
  return getBonePosition(target, 8); // bone 8 = head
}

function distance3D(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

function normalize(vec) {
  const mag = Math.sqrt(vec.x ** 2 + vec.y ** 2 + vec.z ** 2);
  return { x: vec.x / mag, y: vec.y / mag, z: vec.z / mag };
}

function aimAtHead(target) {
  const headPos = getHeadPosition(target);
  const myPos = getPlayerPosition();
  const aimVec = normalize({
    x: headPos.x - myPos.x,
    y: headPos.y - myPos.y,
    z: headPos.z - myPos.z
  });
  moveCrosshair(aimVec);
}

function isHeadLocked(target) {
  return isCrosshairNear(getHeadPosition(target), lockThreshold);
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
  const correction = normalize({ x: dx * 1.1, y: dy * 1.1, z: dz * 1.05 });
  moveCrosshair(correction);
}

function gameLoop() {
  target = findBestTarget();
  if (!target) return;

  correctAimDrift(target);
  aimAtHead(target);

  const locked = isHeadLocked(target);

  if (locked && !isFiring) {
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
