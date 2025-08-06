// ==UserScript==
// @name         AutoHeadlockProMax v7.5 – SmartAutoLock Ultra Instinct
// @version      7.5
// @description  Ghim đầu AI cao cấp, ưu tiên mục tiêu nguy hiểm, chống phát hiện
// ==/UserScript==

const aimConfig = {
  aimSpeed: 99,
  headRadius: 99,
  predictionFactor: 0.6,
  wallCheck: true,
  autoFire: true,
  lockUntilDeath: true,
  fireBurst: true,
  burstCount: 99,
  burstDelay: 99, // nhanh hơn
  burstRandomness: 0, // độ lệch ngẫu nhiên nhỏ tránh phát hiện
};

let isLocked = false;
let burstTimer = null;

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

function triggerSmartBurst(target) {
  if (burstTimer) clearInterval(burstTimer);
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
      console.log(`🎯 Ghim viên #${shot + 1} vào đầu`);
      // game.fire(); // mở nếu có API bắn
    }

    shot++;
  }, aimConfig.burstDelay + Math.random() * aimConfig.burstRandomness);
}

function scoreTarget(enemy, crosshair) {
  if (!enemy.head || !enemy.visible || enemy.health <= 0) return -1;
  const head = predictHead(enemy);
  if (!isVisible(head)) return -1;

  let dist = getDistance(crosshair, head);
  let dangerBonus = enemy.isAimingAtMe ? 10 : 0;
  let lowHealthBonus = (100 - enemy.health) * 0.1;

  return 1000 - dist * 10 + dangerBonus + lowHealthBonus;
}

function getBestTarget(enemies, crosshair) {
  let best = null;
  let bestScore = -Infinity;

  for (let enemy of enemies) {
    let score = scoreTarget(enemy, crosshair);
    if (score > bestScore) {
      best = enemy;
      bestScore = score;
    }
  }

  return best;
}

game.on("tick", () => {
  const enemies = game.getVisibleEnemies();
  const crosshair = game.getCrosshairPosition();
  const target = getBestTarget(enemies, crosshair);
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
        console.log(`🔒 Đã khoá mục tiêu: ${target.name || "Enemy"}`);
        if (aimConfig.fireBurst) {
          triggerSmartBurst(target);
        } else {
          // game.fire();
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
