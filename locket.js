// ==UserScript==
// @name         AutoHeadlockProMax v3.9-GigaGodMode
// @version      3.9
// @description  Ghim đầu siêu cấp: né tâm địch, AI lock khẩn cấp, bắn ngay, hỗ trợ đa tia như MP40
// ==/UserScript==

console.log("🧠 AutoHeadlockProMax v3.9-GigaGodMode ACTIVATED");

const HEAD_BONE_INDEX = 8;
let headPos = { x: 0, y: 0, z: 0 };
let enemyLastPos = null;
let evasionCooldown = 0;

function getDistance(p1, p2) {
  return Math.sqrt(
    (p1.x - p2.x) ** 2 +
    (p1.y - p2.y) ** 2 +
    (p1.z - p2.z) ** 2
  );
}

function predictHead(target) {
  if (!target || typeof getBonePosition !== 'function') return null;

  const currPos = getBonePosition(target, HEAD_BONE_INDEX);
  if (!enemyLastPos) {
    enemyLastPos = { ...currPos };
    return currPos;
  }

  const dx = currPos.x - enemyLastPos.x;
  const dy = currPos.y - enemyLastPos.y;
  const dz = currPos.z - enemyLastPos.z;

  enemyLastPos = { ...currPos };

  return {
    x: currPos.x + dx * 1.3,  // predictive multiplier
    y: currPos.y + dy * 1.3,
    z: currPos.z + dz * 1.3,
  };
}

function evadeEnemyAim(myPos, enemies) {
  for (const enemy of enemies) {
    if (!enemy.isAiming || !enemy.weapon) continue;

    const aimVector = enemy.getAimVector();
    const myHead = getBonePosition("player", HEAD_BONE_INDEX);
    const dot = Math.abs(
      aimVector.x * (myHead.x - enemy.x) +
      aimVector.y * (myHead.y - enemy.y) +
      aimVector.z * (myHead.z - enemy.z)
    );

    if (dot < 1.2) {
      evasionCooldown = 30; // evade for next 30 frames
      return {
        x: myPos.x + Math.random() * 1.5 - 0.75,
        y: myPos.y,
        z: myPos.z + Math.random() * 1.5 - 0.75
      };
    }
  }

  return null;
}

function simulateHumanDrag(current, target, smooth = 0.3) {
  return {
    x: current.x + (target.x - current.x) * smooth,
    y: current.y + (target.y - current.y) * smooth
  };
}

function lockAndShoot(enemies, myPos, crosshair) {
  let target = null;
  let minDistance = Infinity;

  for (const enemy of enemies) {
    if (!enemy.isAlive || !enemy.visible) continue;
    const dist = getDistance(myPos, enemy);
    if (dist < minDistance) {
      minDistance = dist;
      target = enemy;
    }
  }

  if (!target) return;

  const predictedHead = predictHead(target);
  if (!predictedHead) return;

  // Evade enemy aim
  if (evasionCooldown > 0) {
    evasionCooldown--;
    const evadePos = evadeEnemyAim(myPos, enemies);
    if (evadePos) {
      movePlayerTo(evadePos); // giả lập tránh né lock
    }
  }

  // Aim simulation
  const aimPos = simulateHumanDrag(crosshair, {
    x: predictedHead.x,
    y: predictedHead.y
  }, 0.45);

  moveCrosshairTo(aimPos); // ghim từ từ như người thật

  // Auto fire nếu đã gần chính xác
  const threshold = 1.0;
  if (Math.abs(aimPos.x - predictedHead.x) < threshold &&
      Math.abs(aimPos.y - predictedHead.y) < threshold) {
    shootNow(); // bắn liền khi tâm đã gần head
  }
}

// Tích hợp vào tick game
game.on('tick', () => {
  const enemies = getEnemies();
  const myPos = getPlayerPosition();
  const crosshair = getCrosshairPosition();

  lockAndShoot(enemies, myPos, crosshair);
});
