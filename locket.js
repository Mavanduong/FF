// ==UserScript==
// @name         AutoHeadlockProMax v6.0 – HeadOnly KillLock Edition
// @version      6.0
// @description  Ghim 100% đầu, bỏ qua thân, không lệch, bắn chính xác từng viên vào tọa độ đầu
// ==/UserScript==

const aimConfig = {
  headLockSpeed: 2.2,
  headRadius: 0.3,
  predictionFactor: 0.45,
  lockUntilDeath: true,
  wallCheckEnabled: true,
  autoFire: true,
  fireBurstCount: 5,
  burstDelay: 25 // ms
};

let burstTimer = null;
let isLocked = false;

function getDistance(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function predictHead(enemy) {
  const v = enemy.velocity || { x: 0, y: 0, z: 0 };
  return {
    x: enemy.head.x + v.x * aimConfig.predictionFactor,
    y: enemy.head.y + v.y * aimConfig.predictionFactor,
    z: enemy.head.z + v.z * aimConfig.predictionFactor
  };
}

function aimDirect(crosshair, head) {
  return {
    x: crosshair.x + (head.x - crosshair.x) * aimConfig.headLockSpeed,
    y: crosshair.y + (head.y - crosshair.y) * aimConfig.headLockSpeed,
    z: crosshair.z + (head.z - crosshair.z) * aimConfig.headLockSpeed
  };
}

function isInHeadZone(crosshair, head) {
  return getDistance(crosshair, head) <= aimConfig.headRadius;
}

function isVisible(head) {
  if (!aimConfig.wallCheckEnabled) return true;
  return !game.raycastObstructed(head);
}

function triggerBurstFire() {
  if (burstTimer) clearInterval(burstTimer);
  let count = 0;
  burstTimer = setInterval(() => {
    if (count >= aimConfig.fireBurstCount) {
      clearInterval(burstTimer);
      return;
    }
    console.log("🔫 Viên #" + (count + 1) + " bắn vào đầu");
    // game.fire(); // bật nếu bạn có hàm fire
    count++;
  }, aimConfig.burstDelay);
}

function getBestTarget(enemies, crosshair) {
  let best = null;
  let minDist = Infinity;
  for (const enemy of enemies) {
    if (!enemy.head || !enemy.visible) continue;
    const predicted = predictHead(enemy);
    if (!isVisible(predicted)) continue;

    const dist = getDistance(crosshair, predicted);
    if (dist < minDist) {
      minDist = dist;
      best = enemy;
    }
  }
  return best;
}

game.on("tick", () => {
  const crosshair = game.getCrosshairPosition();
  const enemies = game.getVisibleEnemies();
  const target = getBestTarget(enemies, crosshair);
  if (!target) return;

  const head = predictHead(target);
  const newAim = aimDirect(crosshair, head);
  game.setCrosshairPosition(newAim);

  if (aimConfig.lockUntilDeath && aimConfig.autoFire) {
    if (isInHeadZone(newAim, head)) {
      if (!isLocked) {
        isLocked = true;
        console.log("🎯 Đã ghim chính xác vào đầu – xả burst");
        triggerBurstFire();
      }
    } else {
      isLocked = false;
    }
  }
});
