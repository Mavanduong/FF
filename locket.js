// ==UserScript==
// @name         AutoHeadlockProMax v3.21
// @version      3.21
// @description  Ghim 100% đạn thẳng vào đầu, bất kể di chuyển, nhảy, vật cản
// ==/UserScript==

(function () {
  console.log("🎯 AutoHeadlockProMax v3.21 ACTIVATED");

  const HEAD_BONE_INDEX = 8;
  const LOCK_RANGE = 120; // mét
  const LOCK_ANGLE = 60;  // độ, FOV

  game.on("tick", () => {
    const player = game.getLocalPlayer();
    if (!player || !player.weaponReady) return;

    const enemies = game.getEnemiesInRange(LOCK_RANGE);
    let bestTarget = null;
    let bestScore = 0;

    for (const enemy of enemies) {
      if (!enemy.isVisible && !canShootThrough(enemy)) continue;

      const head = predictHead(enemy);
      const score = calculateLockScore(player, head, enemy.velocity);

      if (score > bestScore) {
        bestScore = score;
        bestTarget = enemy;
      }
    }

    if (bestTarget) {
      const targetHead = predictHead(bestTarget);
      forceAimAt(targetHead); // CỨNG 100%
      if (player.isShooting || isAutoFireEnabled()) fire();
    }
  });

  function predictHead(enemy) {
    const headPos = getBonePosition(enemy, HEAD_BONE_INDEX);
    return {
      x: headPos.x + enemy.velocity.x * 0.4,
      y: headPos.y + enemy.velocity.y * 0.4,
      z: headPos.z + enemy.velocity.z * 0.4
    };
  }

  function calculateLockScore(player, headPos, velocity) {
    const distance = getDistance(player.pos, headPos);
    const angle = getAngleBetween(player.view, headPos);

    if (distance > LOCK_RANGE || angle > LOCK_ANGLE) return 0;

    const movingBonus = Math.min(velocity.length * 2, 20);
    const heightFactor = 1 - Math.abs(headPos.y - player.pos.y) / 50;
    return (100 - distance) * heightFactor + movingBonus;
  }

  function forceAimAt(pos) {
    // Không sway, không micro, aim cứng vào đầu
    game.setViewAngleTo(pos);
  }

  function fire() {
    game.pressFire(true);
    setTimeout(() => game.pressFire(false), 40);
  }

  function canShootThrough(enemy) {
    const head = getBonePosition(enemy, HEAD_BONE_INDEX);
    return game.traceLine(game.getLocalPlayer().eyePos, head, true); // true = ignore walls
  }

  function isAutoFireEnabled() {
    return game.settings.autoFire || game.input.shootingGestureDetected;
  }

  function getDistance(a, b) {
    const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  function getAngleBetween(view, target) {
    // Tính góc giữa hướng nhìn và mục tiêu
    const dx = target.x - view.x, dy = target.y - view.y, dz = target.z - view.z;
    const dot = dx * view.x + dy * view.y + dz * view.z;
    const magA = Math.sqrt(view.x**2 + view.y**2 + view.z**2);
    const magB = Math.sqrt(dx**2 + dy**2 + dz**2);
    return Math.acos(dot / (magA * magB)) * (180 / Math.PI);
  }
})();
