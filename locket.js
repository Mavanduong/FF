// ==UserScript==
// @name         AutoHeadlockProMax v7.0 – GodLevel InstaLock Aimbot
// @version      7.0
// @description  Ghim đầu như hack – không lệch – auto re-aim từng viên
// ==/UserScript==

const aimConfig = {
  speed: 3.5,
  headRadius: 0.28,
  predictionFactor: 0.5,
  burstCount: 10,
  burstDelay: 18, // Siêu nhanh nhưng không bị anti-cheat
  lockUntilDead: true,
  autoFire: true,
  wallCheck: true
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

function isInHead(crosshair, head) {
  return getDistance(crosshair, head) <= aimConfig.headRadius;
}

function aimHardLock(targetHead) {
  return {
    x: targetHead.x,
    y: targetHead.y,
    z: targetHead.z
  };
}

function isVisible(targetHead) {
  if (!aimConfig.wallCheck) return true;
  return !game.raycastObstructed(targetHead);
}

function triggerAutoBurst(target) {
  if (burstTimer) clearInterval(burstTimer);
  let shots = 0;

  burstTimer = setInterval(() => {
    if (shots >= aimConfig.burstCount) {
      clearInterval(burstTimer);
      return;
    }

    const crosshair = game.getCrosshairPosition();
    const head = predictHead(target);
    const aimPos = aimHardLock(head);
    game.setCrosshairPosition(aimPos);

    if (isInHead(crosshair, head)) {
      console.log(`💥 Găm viên #${shots + 1} vào đầu`);
      // game.fire(); // bật nếu hỗ trợ
    }

    shots++;
  }, aimConfig.burstDelay);
}

function getTarget(enemies, crosshair) {
  let closest = null;
  let closestDist = Infinity;

  for (let e of enemies) {
    if (!e.head || !e.visible) continue;
    const head = predictHead(e);
    if (!isVisible(head)) continue;

    const dist = getDistance(crosshair, head);
    if (dist < closestDist) {
      closestDist = dist;
      closest = e;
    }
  }

  return closest;
}

game.on("tick", () => {
  const enemies = game.getVisibleEnemies();
  const crosshair = game.getCrosshairPosition();
  const target = getTarget(enemies, crosshair);
  if (!target) return;

  const predictedHead = predictHead(target);
  const aimPos = aimHardLock(predictedHead);
  game.setCrosshairPosition(aimPos);

  if (aimConfig.lockUntilDead && aimConfig.autoFire) {
    if (isInHead(crosshair, predictedHead)) {
      if (!isLocked) {
        isLocked = true;
        console.log("🎯 InstaLock – Bắt đầu bắn burst hack style");
        triggerAutoBurst(target);
      }
    } else {
      isLocked = false;
    }
  }
});
