// ==UserScript==
// @name         AutoHeadlockProMax v12.1-ProLockSquad
// @version      12.1
// @description  Ghim đầu 100% – Bỏ qua thân – Ưu tiên squad nguy hiểm – Giảm lệch nòng – Siêu tốc vuốt
// ==/UserScript==

const config = {
  headLockRatio: 1.0, // Ghim đầu tuyệt đối
  ignoreBodyBelowNeck: true, // Bỏ qua thân dưới
  squadThreatLock: true, // Ưu tiên thằng nguy hiểm nhất team địch
  aimPullSpeed: 9000, // Tăng tốc độ kéo tâm theo đầu
  correctionAfterHeat: true, // Giảm lệch do nòng nóng
  bulletDeviationCompensation: 0.5, // Giảm 50% lệch đạn
};

function isValidTarget(enemy) {
  if (!enemy.isVisible || !enemy.isAlive) return false;
  if (config.ignoreBodyBelowNeck && enemy.targetZone === 'chest' || enemy.targetZone === 'stomach' || enemy.targetZone === 'legs') {
    return false;
  }
  return true;
}

function getPriorityTarget(enemies) {
  let filtered = enemies.filter(e => isValidTarget(e));
  if (config.squadThreatLock) {
    filtered.sort((a, b) => b.dangerLevel - a.dangerLevel); // Lock thằng nguy hiểm nhất
  }
  return filtered[0] || null;
}

function autoAim(game) {
  const target = getPriorityTarget(game.enemies);
  if (!target) return;

  const headPosition = target.headPosition;
  const distance = game.getDistanceTo(headPosition);

  let aimVector = game.getVectorTo(headPosition);
  aimVector = applyStickyLock(aimVector);
  aimVector = applyPrediction(aimVector, target.velocity, distance);

  // Giảm lệch do nòng nóng
  if (config.correctionAfterHeat && game.bulletsFired > 10) {
    aimVector = adjustForHeat(aimVector, game.bulletsFired);
  }

  game.moveCrosshairTo(aimVector, config.aimPullSpeed);
}

function applyStickyLock(vector) {
  vector.x *= config.headLockRatio;
  vector.y *= config.headLockRatio;
  return vector;
}

function applyPrediction(vector, velocity, distance) {
  const predictFactor = distance / 10;
  vector.x += velocity.x * predictFactor;
  vector.y += velocity.y * predictFactor;
  return vector;
}

function adjustForHeat(vector, fired) {
  const heatFactor = Math.min(1, fired / 30); // max 30 viên
  vector.x *= (1 - config.bulletDeviationCompensation * heatFactor);
  vector.y *= (1 - config.bulletDeviationCompensation * heatFactor);
  return vector;
}

// Tick loop
game.on('tick', () => {
  autoAim(game);
});
