// ==UserScript==
// @name         GhostAI_AutoHeadLock_FullMagnetic_v200.0-Final
// @version      200.0
// @description  Ghim toàn băng đạn vào đầu – tất cả vũ khí – max lực – delay 0ms – auto fix lệch
// ==/UserScript==

const ghostAI = {
  lockPower: 9999,
  stickyRadius: 3.0, // Tầm hút đầu dù lệch
  predictOffset: true,
  supportAllWeapons: true,
  dynamicAdjust: true,
  multiBulletCorrection: true,
  wallBypass: true,
};

function aimToHead(enemy, player) {
  const head = enemy.headPosition;
  const dist = distance(player.crosshair, head);

  if (dist > ghostAI.stickyRadius) return;

  let aimX = head.x - player.crosshair.x;
  let aimY = head.y - player.crosshair.y;

  // Tăng lực hút cực mạnh
  player.crosshair.x += aimX * (ghostAI.lockPower / 10000);
  player.crosshair.y += aimY * (ghostAI.lockPower / 10000);
}

function autoAdjustBullet(bullet, targetHead) {
  // Gắn đạn lệch bay lại về đầu
  bullet.trajectory.x += (targetHead.x - bullet.trajectory.x) * 0.9;
  bullet.trajectory.y += (targetHead.y - bullet.trajectory.y) * 0.9;
}

game.on('tick', () => {
  const player = game.localPlayer;
  const enemies = game.getEnemies();

  enemies.forEach(enemy => {
    if (!enemy.visible || enemy.health <= 0) return;

    // Ghim tâm cực mạnh khi vuốt
    if (player.isSwiping) {
      aimToHead(enemy, player);
    }

    // Gắn từng viên bay lệch → về đầu
    if (ghostAI.multiBulletCorrection) {
      game.getBullets().forEach(b => {
        if (b.ownerId === player.id) {
          autoAdjustBullet(b, enemy.headPosition);
        }
      });
    }
  });
});
