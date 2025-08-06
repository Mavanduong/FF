// ==UserScript==
// @name         AutoHeadlockProMax v8.0.999 – BulletMagnet MaxBuff
// @version      8.0.999
// @description  Ghim đầu MP40 từng viên, đạn bay vào đầu, re-aim cực nhanh, max lực 999
// ==/UserScript==

const aimConfig = {
  aimSpeed: 0.999, // mượt gần như tức thì nhưng vẫn có độ "thật"
  headRadius: 0.999, // vùng trúng đầu siêu rộng để ghim dễ
  wallCheck: true,
  autoFire: true,
  lockUntilDeath: true,
  fireBurst: true,
  burstRandomness: 0, // loại bỏ random, mỗi viên chính xác tuyệt đối
  allowBulletRedirect: true, // đạn đang bay vẫn bẻ về đầu
};

let isLocked = false;
let burstTimer = null;
let activeBullets = [];

const weaponProfiles = {
  MP40: { burstCount: 12, burstDelay: 1, predictionFactor: 0.999 },
  M1014: { burstCount: 5, burstDelay: 1, predictionFactor: 0.999 },
  Vector: { burstCount: 14, burstDelay: 1, predictionFactor: 0.999 },
  SCAR: { burstCount: 8, burstDelay: 1, predictionFactor: 0.999 },
  AK: { burstCount: 7, burstDelay: 1, predictionFactor: 0.999 },
  default: { burstCount: 10, burstDelay: 1, predictionFactor: 0.999 }
};

function getDistance(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function predictHead(enemy) {
  const v = enemy.velocity || { x: 0, y: 0, z: 0 };
  const a = enemy.acceleration || { x: 0, y: 0, z: 0 };
  return {
    x: enemy.head.x + v.x * aimConfig.predictionFactor + 0.5 * a.x,
    y: enemy.head.y + v.y * aimConfig.predictionFactor + 0.5 * a.y,
    z: enemy.head.z + v.z * aimConfig.predictionFactor + 0.5 * a.z
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

function isVisible(head) {
  if (!aimConfig.wallCheck) return true;
  return !game.raycastObstructed(head);
}

function scoreTarget(enemy, crosshair) {
  if (!enemy.head || !enemy.visible || enemy.health <= 0) return -1;
  const head = predictHead(enemy);
  if (!isVisible(head)) return -1;
  const dist = getDistance(crosshair, head);
  const dangerBonus = enemy.isAimingAtMe ? 10 : 0;
  const lowHealthBonus = (100 - enemy.health) * 0.1;
  return 1000 - dist * 10 + dangerBonus + lowHealthBonus;
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
      console.log(`🎯 ${game.getCurrentWeapon?.()?.name || "Súng"} viên #${shot + 1} ghim đầu`);
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
    if (dist < aimConfig.headRadius * 2) {
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
        console.log(`🔒 Đã khoá: ${target.name || "Enemy"}`);
        if (aimConfig.fireBurst) {
          triggerSmartBurst(target);
        } else {
          const bullet = game.fire?.();
          if (bullet) activeBullets.push({ bullet, target });
        }
      } else if (target.health <= 0) {
        console.log("☠️ Mục tiêu đã chết – kết thúc burst");
        isLocked = false;
        clearInterval(burstTimer);
      }
    } else {
      isLocked = false;
    }
  }
});
// ==UserScript==
// @name         AutoHeadlockProMax v8.0.999 – BulletMagnet MaxBuff
// @version      8.0.999
// @description  Ghim đầu MP40 từng viên, đạn bay vào đầu, re-aim cực nhanh, max lực 999
// ==/UserScript==

const aimConfig = {
  aimSpeed: 0.999, // mượt gần như tức thì nhưng vẫn có độ "thật"
  headRadius: 0.999, // vùng trúng đầu siêu rộng để ghim dễ
  wallCheck: true,
  autoFire: true,
  lockUntilDeath: true,
  fireBurst: true,
  burstRandomness: 0, // loại bỏ random, mỗi viên chính xác tuyệt đối
  allowBulletRedirect: true, // đạn đang bay vẫn bẻ về đầu
};

let isLocked = false;
let burstTimer = null;
let activeBullets = [];

const weaponProfiles = {
  MP40: { burstCount: 12, burstDelay: 1, predictionFactor: 0.999 },
  M1014: { burstCount: 5, burstDelay: 1, predictionFactor: 0.999 },
  Vector: { burstCount: 14, burstDelay: 1, predictionFactor: 0.999 },
  SCAR: { burstCount: 8, burstDelay: 1, predictionFactor: 0.999 },
  AK: { burstCount: 7, burstDelay: 1, predictionFactor: 0.999 },
  default: { burstCount: 10, burstDelay: 1, predictionFactor: 0.999 }
};

function getDistance(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function predictHead(enemy) {
  const v = enemy.velocity || { x: 0, y: 0, z: 0 };
  const a = enemy.acceleration || { x: 0, y: 0, z: 0 };
  return {
    x: enemy.head.x + v.x * aimConfig.predictionFactor + 0.5 * a.x,
    y: enemy.head.y + v.y * aimConfig.predictionFactor + 0.5 * a.y,
    z: enemy.head.z + v.z * aimConfig.predictionFactor + 0.5 * a.z
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

function isVisible(head) {
  if (!aimConfig.wallCheck) return true;
  return !game.raycastObstructed(head);
}

function scoreTarget(enemy, crosshair) {
  if (!enemy.head || !enemy.visible || enemy.health <= 0) return -1;
  const head = predictHead(enemy);
  if (!isVisible(head)) return -1;
  const dist = getDistance(crosshair, head);
  const dangerBonus = enemy.isAimingAtMe ? 10 : 0;
  const lowHealthBonus = (100 - enemy.health) * 0.1;
  return 1000 - dist * 10 + dangerBonus + lowHealthBonus;
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
      console.log(`🎯 ${game.getCurrentWeapon?.()?.name || "Súng"} viên #${shot + 1} ghim đầu`);
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
    if (dist < aimConfig.headRadius * 2) {
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
        console.log(`🔒 Đã khoá: ${target.name || "Enemy"}`);
        if (aimConfig.fireBurst) {
          triggerSmartBurst(target);
        } else {
          const bullet = game.fire?.();
          if (bullet) activeBullets.push({ bullet, target });
        }
      } else if (target.health <= 0) {
        console.log("☠️ Mục tiêu đã chết – kết thúc burst");
        isLocked = false;
        clearInterval(burstTimer);
      }
    } else {
      isLocked = false;
    }
  }
});
