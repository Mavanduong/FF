// ==UserScript==
// @name         AutoHeadlockProMax v5.9 – UltraLock RapidBurst
// @version      5.9
// @description  Ghim đầu 100% từng viên, auto fire, ưu tiên lock chính xác cho súng xả nhiều viên
// ==/UserScript==

const aimConfig = {
  baseSpeed: 1.5,
  minSpeedRatio: 1.0,
  maxSpeedRatio: 2.0,
  maxEffectiveDistance: 40,
  headZoneRadius: 0.45,
  swipeCorrectionRange: 1.2,
  overPullTolerance: 0.2,
  predictionFactor: 0.4,
  lockUntilDeath: true,
  wallCheckEnabled: true,
  bulletSpreadSupport: true,
  weaponSpread: 0.15,
  burstFireDelay: 30, // mili giây delay giữa các lần bắn burst
  burstCount: 8 // số viên liên tiếp cần ghim vào đầu
};

let isLocked = false;
let burstTimer = null;

function getDistance(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function getDynamicAimSpeed(crosshair, targetHead) {
  const dist = getDistance(crosshair, targetHead);
  const ratio = Math.min(Math.max(aimConfig.maxEffectiveDistance / dist, aimConfig.minSpeedRatio), aimConfig.maxSpeedRatio);
  return aimConfig.baseSpeed * ratio;
}

function predictHead(enemy) {
  const v = enemy.velocity || { x: 0, y: 0, z: 0 };
  return {
    x: enemy.head.x + v.x * aimConfig.predictionFactor,
    y: enemy.head.y + v.y * aimConfig.predictionFactor,
    z: enemy.head.z + v.z * aimConfig.predictionFactor
  };
}

function isInHeadZone(crosshair, head) {
  return getDistance(crosshair, head) <= aimConfig.headZoneRadius;
}

function correctSwipe(crosshair, targetHead, swipeDelta) {
  let corrected = { ...crosshair };
  const dy = targetHead.y - crosshair.y;

  if (Math.abs(dy) < aimConfig.swipeCorrectionRange) {
    if (dy < -aimConfig.overPullTolerance) corrected.y += dy;
    else if (dy > aimConfig.headZoneRadius) corrected.y += dy;
    else corrected = targetHead;
  }

  return corrected;
}

function aimTo(target, current, dynamicSpeed) {
  return {
    x: current.x + (target.x - current.x) * dynamicSpeed,
    y: current.y + (target.y - current.y) * dynamicSpeed,
    z: current.z + (target.z - current.z) * dynamicSpeed
  };
}

function simulateSpreadHit(crosshair, head, distance) {
  const spreadRadius = aimConfig.weaponSpread * distance;
  return getDistance(crosshair, head) <= spreadRadius;
}

function triggerFireBurst() {
  if (burstTimer) clearInterval(burstTimer);

  let count = 0;
  burstTimer = setInterval(() => {
    if (count >= aimConfig.burstCount) {
      clearInterval(burstTimer);
      return;
    }
    console.log("🔫 Bắn viên #" + (count + 1));
    // game.fire(); // bật dòng này nếu có game.fire()
    count++;
  }, aimConfig.burstFireDelay);
}

function autoFireControl(crosshair, head, distance) {
  const shouldFire = isInHeadZone(crosshair, head) || (
    aimConfig.bulletSpreadSupport && simulateSpreadHit(crosshair, head, distance)
  );

  if (shouldFire) {
    if (!isLocked) {
      console.log("🔒 Locked vào đầu - Bắn burst");
      isLocked = true;
    }
    triggerFireBurst();
  } else {
    isLocked = false;
  }
}

function isVisible(target) {
  if (!aimConfig.wallCheckEnabled) return true;
  return !game.raycastObstructed(target);
}

function getBestTarget(enemies, crosshair) {
  let best = null;
  let bestScore = Infinity;

  for (let enemy of enemies) {
    if (!enemy.head || !enemy.visible) continue;
    if (!isVisible(enemy.head)) continue;

    const dist = getDistance(crosshair, enemy.head);
    const dangerFactor = enemy.aimingAtMe ? 0.5 : 1.0;
    const hpFactor = enemy.hp < 30 ? 0.7 : 1.0;
    const score = dist * dangerFactor * hpFactor;

    if (score < bestScore) {
      bestScore = score;
      best = enemy;
    }
  }

  return best;
}

game.on('tick', () => {
  const enemies = game.getVisibleEnemies();
  const crosshair = game.getCrosshairPosition();

  const target = getBestTarget(enemies, crosshair);
  if (!target) return;

  const predictedHead = predictHead(target);
  const swipeDelta = game.getSwipeDelta();
  const corrected = correctSwipe(crosshair, predictedHead, swipeDelta);
  const dynamicSpeed = getDynamicAimSpeed(crosshair, corrected);
  const newAim = aimTo(corrected, crosshair, dynamicSpeed);

  game.setCrosshairPosition(newAim);

  if (aimConfig.lockUntilDeath) {
    const dist = getDistance(crosshair, predictedHead);
    autoFireControl(newAim, predictedHead, dist);
  }
});
