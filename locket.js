// ==UserScript==
// @name         AutoHeadlockProMax v2.7 ProximityPrecisionLock
// @version      2.7
// @description  Tính khoảng cách, chênh lệch độ cao, độ gần để ghim đầu cực chuẩn
// ==/UserScript==

(function () {
  try {
    if (!$response || !$response.body) return $done({});
    let body = $response.body;

    const HEAD_BONE = "head";
    const MAX_DISTANCE = 140;
    const PREDICTION = 1.4;
    const AIM_PRIORITY = 1000;
    const FOV_ANGLE = 55;

    let data = JSON.parse(body);
    const player = data.player;

    function isInFOV(target, player, maxAngle = FOV_ANGLE) {
      const dx = target.x - player.x,
        dy = target.y - player.y,
        dz = target.z - player.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist === 0) return false;
      const forward = player.direction || { x: 0, y: 0, z: 1 };
      const dot = (dx * forward.x + dy * forward.y + dz * forward.z) / dist;
      const angle = Math.acos(dot) * (180 / Math.PI);
      return angle < maxAngle;
    }

    function calcDistance(a, b) {
      const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    function applyProLock(enemy, targetPos) {
      enemy.aimPosition = {
        x: targetPos.x,
        y: targetPos.y,
        z: targetPos.z
      };
      enemy.smoothLock = false;
      enemy.lockSpeed = 1.0;
      enemy.stickiness = 1.0;
      enemy._internal_autoLock = true;
      enemy._internal_priority = AIM_PRIORITY;

      // Xoá các trường có khả năng bị phát hiện
      ["autoLock", "aimHelp", "priority", "headLock", "aimBot", "lockZone", "debugAim"].forEach(k => delete enemy[k]);
    }

    let bestTarget = null;
    let bestScore = 0;

    if (Array.isArray(data.targets)) {
      for (let enemy of data.targets) {
        if (!enemy?.bone?.[HEAD_BONE] || enemy.obstacleBetween) continue;
        const head = enemy.bone[HEAD_BONE];

        const velocity = enemy.velocity || { x: 0, y: 0, z: 0 };
        const predictedHead = {
          x: head.x + velocity.x * PREDICTION,
          y: head.y + velocity.y * PREDICTION,
          z: head.z + velocity.z * PREDICTION
        };

        if (!isInFOV(predictedHead, player)) continue;

        const distance = calcDistance(player, predictedHead);
        if (distance > MAX_DISTANCE) continue;

        const heightDiff = Math.abs(predictedHead.y - player.y);
        const heightRatio = heightDiff / distance;
        const proximityScore = (1 / distance) * (1 - heightRatio); // Tối ưu gần + ngang tầm

        if (["standing", "jumping", "crouching", "prone"].includes(enemy.posture)) {
          if (proximityScore > bestScore) {
            bestScore = proximityScore;
            bestTarget = { enemy, pos: predictedHead };
          }
        }
      }
    }

    if (bestTarget) {
      applyProLock(bestTarget.enemy, bestTarget.pos);
    }

    body = JSON.stringify(data);
    $done({ body });

  } catch (e) {
    $done({});
  }
})();
