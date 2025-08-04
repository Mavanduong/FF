// ==UserScript==
// @name         AutoHeadlockProMax v3.23 - HardLock Ultimate Precision
// @version      3.23.0
// @description  Ghim đầu 100%, không lệch, không chệch, theo địch ở mọi trạng thái
// ==/UserScript==

(function () {
  console.log("🎯 AutoHeadlockProMax v3.23 - HARDLOCK MODE ENABLED");

  const HEAD_BONE = 8;
  const LOCK_RANGE = 150;
  const LOCK_ANGLE = 85;
  const BULLET_DELAY = 45;
  const HARDLOCK_FORCE = 1.0;

  game.on("tick", () => {
    const player = game.getLocalPlayer();
    if (!player || !player.weaponReady) return;

    const enemies = game.getEnemiesInRange(LOCK_RANGE);
    let bestTarget = null;
    let bestScore = -1;

    for (const enemy of enemies) {
      if (!isValidTarget(enemy)) continue;

      const headPos = predictHead(enemy);
      const score = evaluate(player, headPos, enemy);
      if (score > bestScore) {
        bestScore = score;
        bestTarget = { enemy, headPos };
      }
    }

    if (bestTarget) {
      const { headPos } = bestTarget;
      applyLockView(player, headPos);

      if (shouldFire()) {
        fireBullet();
      }
    }
  });

  function isValidTarget(enemy) {
    return enemy && enemy.isAlive && (enemy.isVisible || canShootThrough(enemy));
  }

  function predictHead(enemy) {
    const bone = getBonePosition(enemy, HEAD_BONE);
    return {
      x: bone.x + enemy.velocity.x * 0.5,
      y: bone.y + enemy.velocity.y * 0.5,
      z: bone.z + enemy.velocity.z * 0.5
    };
  }

  function evaluate(player, head, enemy) {
    const dist = getDistance(player.pos, head);
    const angle = getAngle(player.view, head);
    const height = Math.abs(head.y - player.pos.y);
    return (100 - dist) * HARDLOCK_FORCE + (90 - angle) * 1.2 - height * 0.8 + (enemy.velocity.length * 1.5);
  }

  function applyLockView(player, headPos) {
    const smooth = 0.96; // gần như 100% nhưng không cứng máy
    const view = player.view;
    view.x += (headPos.x - view.x) * smooth;
    view.y += (headPos.y - view.y) * smooth;
    view.z += (headPos.z - view.z) * smooth;
    game.setViewAngleTo(view);
  }

  function fireBullet() {
    game.pressFire(true);
    setTimeout(() => game.pressFire(false), BULLET_DELAY);
  }

  function shouldFire() {
    return game.input.isShooting || game.settings.autoFire || game.input.shootingGestureDetected;
  }

  function canShootThrough(enemy) {
    const head = getBonePosition(enemy, HEAD_BONE);
    return game.traceLine(game.getLocalPlayer().eyePos, head, true);
  }

  function getBonePosition(enemy, boneIndex) {
    return enemy.bones?.[boneIndex] || enemy.pos;
  }

  function getDistance(a, b) {
    const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  function getAngle(view, target) {
    const dx = target.x - view.x;
    const dy = target.y - view.y;
    const dz = target.z - view.z;
    const dot = dx * view.x + dy * view.y + dz * view.z;
    const magA = Math.sqrt(view.x**2 + view.y**2 + view.z**2);
    const magB = Math.sqrt(dx**2 + dy**2 + dz**2);
    return Math.acos(dot / (magA * magB)) * (180 / Math.PI);
  }
})();
