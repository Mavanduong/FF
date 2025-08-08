// ==UserScript==
// @name         AutoHeadlockProMax v13.0-GodScan999X
// @version      13.0
// @description  AI đọc hướng quay đầu + LaserAim theo từng pixel – Ghim trước đầu 1000%
// ==/UserScript==

const godConfig = {
  aimSpeed: 9999,
  stickyHead: true,
  predictTime: 120, // ms
  autoFire: true,
  laserAutoAim: true,
  lockRange: 160,
  bodyPenalty: 0.1, // giảm nếu lệch đầu
};

function getEnemyDirection(enemy) {
  let dx = enemy.x - enemy.lastX;
  let dy = enemy.y - enemy.lastY;
  let dz = enemy.z - enemy.lastZ;
  return { dx, dy, dz };
}

function predictHeadPosition(enemy) {
  const dir = getEnemyDirection(enemy);
  const predictX = enemy.headX + dir.dx * (godConfig.predictTime / 1000);
  const predictY = enemy.headY + dir.dy * (godConfig.predictTime / 1000);
  const predictZ = enemy.headZ + dir.dz * (godConfig.predictTime / 1000);
  return { x: predictX, y: predictY, z: predictZ };
}

function laserAimTo(headPos) {
  game.crosshair.x = headPos.x;
  game.crosshair.y = headPos.y;
  game.crosshair.z = headPos.z;
}

game.on('tick', () => {
  const enemies = game.getEnemies().filter(e => e.visible && e.distance < godConfig.lockRange);
  if (!enemies.length) return;

  const target = enemies.reduce((best, curr) => {
    const currHead = predictHeadPosition(curr);
    const currDist = game.getDistance(game.crosshair, currHead);
    return currDist < best.dist ? { enemy: curr, dist: currDist } : best;
  }, { enemy: null, dist: Infinity }).enemy;

  if (target) {
    const aimPoint = predictHeadPosition(target);
    if (godConfig.laserAutoAim) laserAimTo(aimPoint);

    if (godConfig.autoFire && game.crosshair.isNear(aimPoint, 0.5)) {
      game.fire();
    }
  }
});
