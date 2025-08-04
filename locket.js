// ==UserScript==
// @name         AutoHeadlockProMax v3.21 - Ghim 100% Không Né
// @version      3.21
// @description  Ghim đầu 100%, không che giấu, không sway, vuốt hay không đều lock cứng
// ==/UserScript==

(function () {
  try {
    if (!$response || !$response.body) return $done({});
    let body = $response.body;
    let data = JSON.parse(body);

    const HEAD_BONE = "head";
    const MAX_DISTANCE = 150;
    const AIM_PRIORITY = 99999;
    const LOCK_SPEED = 1.5;
    const STICKINESS = 1.5;
    const HEAD_OFFSET_Y = 0.04;
    const PREDICTION_BASE = 1.2;

    const player = data.player || {};
    const squadTargetId = globalThis._squadLockTargetId || null;

    function distance(a, b) {
      const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    function isValidTarget(enemy) {
      return enemy && enemy.bone && enemy.bone[HEAD_BONE] && !enemy.obstacleBetween;
    }

    function predictHead(head, velocity, predictionTime) {
      return {
        x: head.x + velocity.x * predictionTime,
        y: head.y + velocity.y * predictionTime,
        z: head.z + velocity.z * predictionTime
      };
    }

    function applyAbsoluteLock(enemy, head) {
      enemy.aimPosition = {
        x: head.x,
        y: head.y + HEAD_OFFSET_Y,
        z: head.z
      };
      enemy.lockSpeed = LOCK_SPEED;
      enemy.stickiness = STICKINESS;
      enemy.smoothLock = false;
      enemy._internal_autoLock = true;
      enemy._internal_priority = AIM_PRIORITY;

      // Dọn sạch mọi thứ không cần
      [
        "autoLock", "aimHelp", "priority", "headLock",
        "aimBot", "lockZone", "debugAim"
      ].forEach(k => delete enemy[k]);
    }

    let best = null;
    let highest = -Infinity;

    if (Array.isArray(data.targets)) {
      for (const enemy of data.targets) {
        if (!isValidTarget(enemy)) continue;
        const head = enemy.bone[HEAD_BONE];
        const velocity = enemy.velocity || { x: 0, y: 0, z: 0 };
        const dist = distance(player, head);
        if (dist > MAX_DISTANCE) continue;

        const predictionTime = dist > 100 ? 1.5 : dist < 30 ? 0.5 : PREDICTION_BASE;
        const predicted = predictHead(head, velocity, predictionTime);

        const score = (1 / dist) * (enemy.aimingAt === player.id ? 1.5 : 1.0) * (enemy.isFiring ? 1.2 : 1.0);
        if (
          (!squadTargetId && score > highest) ||
          (squadTargetId && enemy.id === squadTargetId)
        ) {
          highest = score;
          best = { enemy, pos: predicted };
        }
      }
    }

    if (best) {
      globalThis._squadLockTargetId = best.enemy.id;
      applyAbsoluteLock(best.enemy, best.pos);
    } else {
      globalThis._squadLockTargetId = null;
    }

    $done({ body: JSON.stringify(data) });

  } catch (err) {
    $done({});
  }
})();
