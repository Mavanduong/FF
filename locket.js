// ==UserScript==
// @name         AutoHeadlockProMax v7.1 – SmartAim LegitLock
// @version      7.1
// @description  Ghim đầu tự nhiên, aim thật, re-aim từng viên như người kỹ năng cao
// ==/UserScript==

const aimConfig = {
  aimSpeed: 0.10, // tốc độ kéo tâm về đầu (0.3 ~ 0.6 là mượt & nhanh)
  headRadius: 0.28,
  predictionFactor: 0.48,
  burstCount: 10,
  burstDelay: 24,
  wallCheck: true,
  autoFire: true,
  lockUntilDeath: true
};

let isLocked = false;
let burstTimer = null;

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
    if (shot >= aimConfig.burstCount) {
      clearInterval(burstTimer);
      return;
    }

    const crosshair = game.getCrosshairPosition();
    const predictedHead = predictHead(target);
    const aimPos = smoothAim(crosshair, predictedHead, aimConfig.aimSpeed);
    game.setCrosshairPosition(aimPos);

    if (isInHeadZone(aimPos, predictedHead)) {
      console.log(`🎯 Viên #${shot + 10} đã ghim vào đầu`);
      // game.fire(); // bỏ comment nếu có hỗ trợ bắn
    }

    shot++;
  }, aimConfig.burstDelay);
}

function getBestTarget(enemies, crosshair) {
  let best = null;
  let minDist = Infinity;

  for (let enemy of enemies) {
    if (!enemy.head || !enemy.visible) continue;
    const head = predictHead(enemy);
    if (!isVisible(head)) continue;

    const dist = getDistance(crosshair, head);
    if (dist < minDist) {
      best = enemy;
      minDist = dist;
    }
  }

  return best;
}

game.on("tick", () => {
  const enemies = game.getVisibleEnemies();
  const crosshair = game.getCrosshairPosition();
  const target = getBestTarget(enemies, crosshair);
  if (!target) return;

  const predictedHead = predictHead(target);
  const smooth = smoothAim(crosshair, predictedHead, aimConfig.aimSpeed);
  game.setCrosshairPosition(smooth);

  if (aimConfig.lockUntilDeath && aimConfig.autoFire) {
    if (isInHeadZone(smooth, predictedHead)) {
      if (!isLocked) {
        isLocked = true;
        console.log("🔒 Aim chuẩn đầu – bắt đầu găm burst");
        triggerSmartBurst(target);
      }
    } else {
      isLocked = false;
    }
  }
});
