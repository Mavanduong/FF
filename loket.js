
// ==UserScript==
// @name         AutoHeadlockProMax v14.0-GigaQuantumLaserAI-Ultimate
// @version      14.0
// @description  Tự động ghim đầu + laser theo xoay đầu địch + né tường + chọn mục tiêu yếu nhất + ghim 3 viên combo sọ
// ==/UserScript==

const config = {
  aimSpeed: 9999,
  maxDistance: 180,
  lockPriority: "lowestHP", // Ưu tiên địch máu thấp
  enableLaserFollow: true,
  enableWallAvoidance: true,
  comboBurst: 3,
  reAimDelay: 10,
  predictionFactor: 1.5
};

function getTarget(game) {
  const enemies = game.getEnemies().filter(e => e.visible && e.health > 0 && distanceTo(e) < config.maxDistance);
  enemies.sort((a, b) => a.health - b.health); // Ưu tiên máu thấp
  return enemies[0] || null;
}

function distanceTo(target) {
  const dx = target.x - game.player.x;
  const dy = target.y - game.player.y;
  return Math.sqrt(dx*dx + dy*dy);
}

function aimAt(target) {
  if (!target) return;

  let head = target.getHeadPosition();
  if (config.enableLaserFollow && target.headTurnDirection) {
    head.x += target.headTurnDirection.x * config.predictionFactor;
    head.y += target.headTurnDirection.y * config.predictionFactor;
  }

  if (config.enableWallAvoidance && game.isObstacleBetween(game.player, target)) return;

  game.aim.setTarget(head, config.aimSpeed);
}

game.on("tick", () => {
  const target = getTarget(game);
  aimAt(target);

  if (target && game.shouldShoot()) {
    for (let i = 0; i < config.comboBurst; i++) {
      setTimeout(() => game.shoot(), i * config.reAimDelay);
    }
  }
});
