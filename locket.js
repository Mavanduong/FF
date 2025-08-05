// ==UserScript==
// @name         AutoHeadlockProMax v5.2.0 Vuốt Là Chết™
// @version      5.2.0
// @description  Vuốt nhẹ 1 cái là ghim đầu tới chết. Không tự bắn, không tự lock khi không vuốt. An toàn, chính xác, đáng sợ.
// ==/UserScript==

console.log("🔥 AutoHeadlockProMax v5.2.0 Vuốt Là Chết™ ACTIVATED");

let isTriggerHeld = false;
let target = null;
let bodyLockFrames = 0;
let lastCrosshair = null;
let swipeDetected = false;
let lockEngaged = false;

const lockThreshold = 0.998;
const bodyLockThreshold = 0.88;
const smoothingClose = 0.12;
const smoothingFar = 0.25;
const swipeThreshold = 0.0015; // độ nhạy vuốt (thấp = nhạy hơn)

function getHeadPosition(target) {
  return getBonePosition(target, 8);
}

function getBodyPosition(target) {
  return getBonePosition(target, 3);
}

function predictHeadPosition(target, msAhead = 90) {
  const head = getHeadPosition(target);
  const vel = getEntityVelocity(target);
  return {
    x: head.x + vel.x * (msAhead / 1000),
    y: head.y + vel.y * (msAhead / 1000),
    z: head.z + vel.z * (msAhead / 1000)
  };
}

function getPlayerDistanceTo(target) {
  return distance3D(getPlayerPosition(), getHeadPosition(target));
}

function distance3D(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

function normalize(vec) {
  const mag = Math.sqrt(vec.x ** 2 + vec.y ** 2 + vec.z ** 2);
  return { x: vec.x / mag, y: vec.y / mag, z: vec.z / mag };
}

function moveSmoothTo(vec, smoothing = 0.2) {
  moveCrosshair({
    x: vec.x * (1 - smoothing),
    y: vec.y * (1 - smoothing),
    z: vec.z * (1 - smoothing)
  });
}

function aimAtPredictedHead(target) {
  const head = predictHeadPosition(target);
  const myPos = getPlayerPosition();
  const aimVec = normalize({
    x: head.x - myPos.x,
    y: head.y - myPos.y,
    z: head.z - myPos.z
  });

  const dist = getPlayerDistanceTo(target);
  const smoothing = dist < 20 ? smoothingClose : smoothingFar;
  moveSmoothTo(aimVec, smoothing);
}

function isHeadLocked(target, threshold = lockThreshold) {
  return isCrosshairNear(getHeadPosition(target), threshold);
}

function isBodyLocked(target) {
  return isCrosshairNear(getBodyPosition(target), bodyLockThreshold);
}

function elevateIfStuckOnBody(target) {
  if (isBodyLocked(target) && !isHeadLocked(target)) {
    bodyLockFrames++;
    if (bodyLockFrames > 3) {
      const head = getHeadPosition(target);
      const body = getBodyPosition(target);
      const liftVec = normalize({
        x: head.x - body.x,
        y: head.y - body.y,
        z: head.z - body.z
      });
      moveCrosshair({
        x: liftVec.x * 0.8,
        y: liftVec.y * 0.8,
        z: liftVec.z * 0.8
      });
    }
  } else {
    bodyLockFrames = 0;
  }
}

function findBestVisibleTarget() {
  const enemies = getNearbyEnemies();
  let best = null;
  let bestScore = -Infinity;

  for (const enemy of enemies) {
    if (!enemy.visible || !enemy.headVisible) continue;

    const head = getHeadPosition(enemy);
    const dist = distance3D(getPlayerPosition(), head);
    const score = 100 - dist;

    if (score > bestScore) {
      bestScore = score;
      best = enemy;
    }
  }

  return best;
}

function detectSwipe() {
  const current = getCrosshairPosition();
  if (!lastCrosshair) {
    lastCrosshair = current;
    return false;
  }

  const dx = current.x - lastCrosshair.x;
  const dy = current.y - lastCrosshair.y;
  const dz = current.z - lastCrosshair.z;
  const movement = Math.sqrt(dx ** 2 + dy ** 2 + dz ** 2);

  lastCrosshair = current;
  return movement > swipeThreshold;
}

// Khi giữ chuột trái
function onFireKeyDown() {
  isTriggerHeld = true;
}

// Khi thả chuột trái
function onFireKeyUp() {
  isTriggerHeld = false;
  swipeDetected = false;
  lockEngaged = false;
  lastCrosshair = null;
}

// Vòng lặp chính
function gameLoop() {
  if (!isTriggerHeld) {
    lockEngaged = false;
    return;
  }

  // Vuốt nhẹ = bật chế độ ghim
  if (!lockEngaged) {
    swipeDetected = detectSwipe();
    if (swipeDetected) {
      lockEngaged = true;
    } else {
      return;
    }
  }

  // Nếu đã vuốt => ghim liên tục cho tới khi thả chuột
  target = findBestVisibleTarget();
  if (!target) return;

  aimAtPredictedHead(target);
  elevateIfStuckOnBody(target);
}

setInterval(gameLoop, 16);

// Gắn trigger chuột trái
bindFireKey(onFireKeyDown, onFireKeyUp);

// Gỡ giật nếu có hỗ trợ
removeRecoil?.();
