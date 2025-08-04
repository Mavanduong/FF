// ==UserScript==
// @name         AutoHeadlockProMax v4.4 HyperGodMode
// @version      4.4.1
// @description  Dự đoán di chuyển, ghi nhớ kẻ địch, ghim đầu cưỡng bức, né AI nâng cao, xuyên vật thể nếu cần + Sound ESP Tracking
// ==/UserScript==

console.log("🎯 AutoHeadlockProMax v4.4.1 HyperGodMode + SoundESP ACTIVATED");

let target = null;
let isFiring = false;
let consecutiveHeadshots = 0;
let bodyLockFrames = 0;
const burstDelay = 50;

const lockThreshold = 0.995;
const softLockThreshold = 0.97;
const bodyLockThreshold = 0.88;

const enemyStats = new Map();
let soundTargets = [];

function getHeadPosition(target) {
  return getBonePosition(target, getPreferredBone(target));
}

function getBodyPosition(target) {
  return getBonePosition(target, 3);
}

function getPreferredBone(target) {
  const stats = enemyStats.get(target.id);
  if (!stats) return 8;
  if (stats.jumps > stats.crouches * 2) return 3;
  return 8;
}

function distance3D(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

function normalize(vec) {
  const mag = Math.sqrt(vec.x ** 2 + vec.y ** 2 + vec.z ** 2);
  return { x: vec.x / mag, y: vec.y / mag, z: vec.z / mag };
}

function predictHeadPosition(target, msAhead = 80) {
  const head = getHeadPosition(target);
  const vel = getEntityVelocity(target);
  return {
    x: head.x + vel.x * (msAhead / 1000),
    y: head.y + vel.y * (msAhead / 1000),
    z: head.z + vel.z * (msAhead / 1000)
  };
}

function getDynamicSmoothing(target) {
  const dist = distance3D(getPlayerPosition(), getHeadPosition(target));
  if (dist > 50) return 0.9;
  if (dist > 20) return 0.7;
  return 0.5;
}

function moveSmoothTo(vec, smoothing = 0.7) {
  moveCrosshair({
    x: vec.x * smoothing,
    y: vec.y * smoothing,
    z: vec.z * smoothing
  });
}

function aimAtPredictedHead(target, smoothing = 0.5) {
  const head = predictHeadPosition(target);
  const myPos = getPlayerPosition();
  const aimVec = normalize({
    x: head.x - myPos.x,
    y: head.y - myPos.y,
    z: head.z - myPos.z
  });

  if (soundTargets.length && distance3D(head, soundTargets[0].pos) < 5) {
    smoothing = 0.3;
  }

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
      Math.random() > 0.5 ? dodgeLeftOrRight() : jumpOrCrouch();
    }
  }
}

function elevateIfBodyLocked(target) {
  if (isBodyLocked(target) && !isHeadLocked(target)) {
    const head = getHeadPosition(target);
    const body = getBodyPosition(target);
    const lift = normalize({
      x: head.x - body.x,
      y: head.y - body.y,
      z: head.z - body.z
    });
    moveCrosshair({
      x: lift.x * 0.55,
      y: lift.y * 0.55,
      z: lift.z * 0.55
    });
  }
}

function elevateIfStuckOnBody(target) {
  if (isBodyLocked(target) && !isHeadLocked(target)) {
    bodyLockFrames++;
    if (bodyLockFrames > 5) {
      aimAtPredictedHead(target, 1.0);
      moveCrosshair({ x: 0, y: 0, z: 0.01 });
    }
  } else {
    bodyLockFrames = 0;
  }
}

function trackEnemyBehavior(enemy) {
  const stat = enemyStats.get(enemy.id) || { jumps: 0, crouches: 0 };
  if (enemy.isJumping) stat.jumps++;
  if (enemy.isCrouching) stat.crouches++;
  enemyStats.set(enemy.id, stat);
}

function updateSoundTargets() {
  const sounds = getRecentEnemySounds?.() || [];
  soundTargets = sounds
    .filter(s => Date.now() - s.timestamp < 800)
    .map(s => ({ pos: s.position, priority: s.type === 'footstep' ? 1 : (s.type === 'reload' ? 2 : 3) }));
}

function findSoundTarget() {
  updateSoundTargets();
  if (soundTargets.length === 0) return null;
  soundTargets.sort((a, b) => b.priority - a.priority);
  return soundTargets[0].pos;
}

function findBestTarget() {
  const enemies = getNearbyEnemies();
  let best = null;
  let bestScore = -Infinity;

  for (const enemy of enemies) {
    if (!enemy.visible) continue;
    trackEnemyBehavior(enemy);

    const head = getHeadPosition(enemy);
    const distance = distance3D(getPlayerPosition(), head);
    const exposure = enemy.headVisible ? 1 : 0.3;
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
  if (!target) {
    const soundPos = findSoundTarget();
    if (soundPos) {
      const myPos = getPlayerPosition();
      const vec = normalize({
        x: soundPos.x - myPos.x,
        y: soundPos.y - myPos.y,
        z: soundPos.z - myPos.z
      });
      moveSmoothTo(vec, 0.5);
    }
    return;
  }

  aimAtPredictedHead(target, getDynamicSmoothing(target));
  elevateIfBodyLocked(target);
  elevateIfStuckOnBody(target);

  if ((isHeadLocked(target, softLockThreshold) || isHeadLocked(target)) && !isFiring) {
    consecutiveHeadshots++;
    fire();
    autoBurstFire(3 + Math.floor(Math.random() * 3));
  } else {
    consecutiveHeadshots = 0;
  }

  simulateAvoidEnemyAim();
}

setInterval(gameLoop, 16);
removeRecoil?.();
