// ==UserScript==
// @name         AutoHeadlockProMax v8.1.0-GodModeX1000
// @version      8.1.0
// @description  Ghim đầu thần thánh, 1000% chính xác, chỉnh đạn giữa không trung, bắn như thần
// ==/UserScript==

const aimConfig = {
  aimSpeed: 1, // tức thì
  headRadius: 9999, // vùng đầu rộng nhất có thể
  wallCheck: false, // xuyên tường
  autoFire: true,
  lockUntilDeath: true,
  fireBurst: true,
  burstRandomness: 0, // không random
  allowBulletRedirect: true,
  prioritiseDangerousEnemy: true,
  adaptivePrediction: true,
};

let isLocked = false;
let burstTimer = null;
let activeBullets = [];

const weaponProfiles = {
  MP40: { burstCount: 30, burstDelay: 1, predictionFactor: 1.5 },
  M1014: { burstCount: 12, burstDelay: 1, predictionFactor: 1.2 },
  Vector: { burstCount: 32, burstDelay: 1, predictionFactor: 1.5 },
  SCAR: { burstCount: 15, burstDelay: 1, predictionFactor: 1.4 },
  AK: { burstCount: 13, burstDelay: 1, predictionFactor: 1.3 },
  default: { burstCount: 20, burstDelay: 1, predictionFactor: 1.4 }
};

function getDistance(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function predictHead(enemy) {
  const v = enemy.velocity || { x: 0, y: 0, z: 0 };
  const a = enemy.acceleration || { x: 0, y: 0, z: 0 };
  const predictionFactor = aimConfig.adaptivePrediction ? getDistance(enemy.position, game.player.position) * 0.02 : aimConfig.predictionFactor;
  return {
    x: enemy.head.x + v.x * predictionFactor + 0.5 * a.x,
    y: enemy.head.y + v.y * predictionFactor + 0.5 * a.y,
    z: enemy.head.z + v.z * predictionFactor + 0.5 * a.z
  };
}

function smoothAim(from, to, speed) {
  return {
    x: from.x + (to.x - from.x) * speed,
    y: from.y + (to.y - from.y) * speed,
    z: from.z + (to.z - from.z) * speed
  };
}

function isInHeadZone(crosshair, head) {
  return getDistance(crosshair, head) <= aimConfig.headRadius;
}

function scoreTarget(enemy, crosshair) {
  if (!enemy.head || !enemy.visible || enemy.health <= 0) return -1;
  const head = predictHead(enemy);
  if (!isVisible(head)) return -1;

  const dist = getDistance(crosshair, head);
  const danger = enemy.isAimingAtMe ? 1000 : 0;
  const healthFactor = (100 - enemy.health) * 10;
  const movingSpeed = getDistance(enemy.velocity, { x: 0, y: 0, z: 0 }) * 100;

  return 9999 - dist * 5 + danger + healthFactor + movingSpeed;
}

function isVisible(head) {
  if (!aimConfig.wallCheck) return true;
  return !game.raycastObstructed(head);
}

function getBestTarget(enemies, crosshair) {
  let best = null;
  let bestScore = -Infinity;
  for (const enemy of enemies) {
    const score = scoreTarget(enemy, crosshair);
    if (score > bestScore) {
      best = enemy;
      bestScore = score;
    }
  }
  return best;
}

function applyWeaponProfile() {
  const weapon = game.getCurrentWeapon?.()?.name || "default";
  const profile = weaponProfiles[weapon] || weaponProfiles.default;
  aimConfig.burstCount = profile.burstCount;
  aimConfig.burstDelay = profile.burstDelay;
  aimConfig.predictionFactor = profile.predictionFactor;
}

function triggerSmartBurst(target) {
  if (burstTimer) clearInterval(burstTimer);
  applyWeaponProfile();

  let shot = 0;
  burstTimer = setInterval(() => {
    if (shot >= aimConfig.burstCount || !target || target.health <= 0) {
      clearInterval(burstTimer);
      return;
    }

    const crosshair = game.getCrosshairPosition();
    const predictedHead = predictHead(target);
    const aimPos = smoothAim(crosshair, predictedHead, aimConfig.aimSpeed);
    game.setCrosshairPosition(aimPos);

    if (isInHeadZone(aimPos, predictedHead)) {
      console.log(`🎯 GODMODE 🔥 Viên #${shot + 1} ghim đầu`);
      const bullet = game.fire?.();
      if (bullet) activeBullets.push({ bullet, target });
    }

    shot++;
  }, aimConfig.burstDelay);
}

function adjustBulletsInAir() {
  if (!aimConfig.allowBulletRedirect || activeBullets.length === 0) return;

  activeBullets = activeBullets.filter(({ bullet, target }) => {
    if (!bullet || bullet.hit || target.health <= 0) return false;

    const predictedHead = predictHead(target);
    const dist = getDistance(bullet.position, predictedHead);
    if (dist < aimConfig.headRadius * 5) {
      bullet.direction = smoothAim(bullet.position, predictedHead, 1);
    }
    return true;
  });
}

game.on("tick", () => {
  const enemies = game.getVisibleEnemies();
  const crosshair = game.getCrosshairPosition();
  const target = getBestTarget(enemies, crosshair);

  adjustBulletsInAir();

  if (!target) {
    isLocked = false;
    return;
  }

  const predictedHead = predictHead(target);
  const aimNow = smoothAim(crosshair, predictedHead, aimConfig.aimSpeed);
  game.setCrosshairPosition(aimNow);

  if (aimConfig.autoFire && aimConfig.lockUntilDeath) {
    if (isInHeadZone(aimNow, predictedHead)) {
      if (!isLocked) {
        isLocked = true;
        console.log(`🔒 GOD LOCKED: ${target.name || "Enemy"}`);
        if (aimConfig.fireBurst) {
          triggerSmartBurst(target);
        } else {
          const bullet = game.fire?.();
          if (bullet) activeBullets.push({ bullet, target });
        }
      } else if (target.health <= 0) {
        console.log("☠️ Kết liễu – enemy deleted");
        isLocked = false;
        clearInterval(burstTimer);
      }
    } else {
      isLocked = false;
    }
  }
});
