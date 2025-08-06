// ==UserScript==
// @name         AutoHeadlockProMax v7.2 – SmartAutoLock FULL AIM
// @version      7.2
// @description  Tự động aim tốc độ cao, ghim đầu 100%, không cần vuốt
// ==/UserScript==

const aimConfig = {
  aimSpeed: 1, // tốc độ kéo tâm nhanh hơn nhiều
  headRadius: 0.25,
  predictionFactor: 0.50,
  wallCheck: true,
  autoFire: true,
  lockUntilDeath: true,
  fireBurst: true,
  burstCount: 8,
  burstDelay: 25
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
      console.log(`🎯 Viên #${shot + 1} ghim đầu`);
      // game.fire(); // mở nếu có API bắn
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
  const aimNow = smoothAim(crosshair, predictedHead, aimConfig.aimSpeed);
  game.setCrosshairPosition(aimNow);

  // Không chờ điều kiện vuốt – auto lock luôn
  if (aimConfig.autoFire && aimConfig.lockUntilDeath) {
    if (isInHeadZone(aimNow, predictedHead)) {
      if (!isLocked) {
        isLocked = true;
        console.log("🔒 Locked – bắt đầu găm liên tiếp");
        if (aimConfig.fireBurst) triggerSmartBurst(target);
        else {
          // game.fire(); // nếu không dùng burst
        }
      }
    } else {
      isLocked = false;
    }
  }
});
