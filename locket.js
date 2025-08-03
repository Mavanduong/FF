// ==UserScript==
// @name         AutoHeadlockProMax v3.1 GodLock-Tracking
// @version      3.1
// @description  Ghim đầu/cổ theo thời gian thực: tracking đầu, vuốt gần auto ghim, squad lock, prediction, chống ban
// ==/UserScript==

(function () {
  try {
    if (!$response || !$response.body) return $done({});

    let body = $response.body;
    let data = JSON.parse(body);

    const HEAD_BONE = "head";
    const MAX_DISTANCE = 150;
    const BASE_FOV = 55;
    const BASE_PREDICTION = 1.2;
    const AIM_PRIORITY = 1000;
    const HEAD_OFFSET_Y = 0.04;
    const NECK_OFFSET_Y = -0.08;

    const player = data.player;
    const scopeZoom = player.scopeZoom || 1;
    const adjustedFOV = BASE_FOV / scopeZoom;
    const swipeDetected = player.lastSwipeTime && Date.now() - player.lastSwipeTime < 350;
    const aimDragDelta = player.lastDragOffset || 0;
    const closeToHeadSwipe = aimDragDelta < 5; // gần như trúng

    const squadTargetId = globalThis._squadLockTargetId || null;

    function isInFOV(target, player, maxAngle = adjustedFOV) {
      const dx = target.x - player.x, dy = target.y - player.y, dz = target.z - player.z;
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

    function applySmartLock(enemy, targetPos, distance, swipe, almostSwipe) {
      const easing = distance < 30 ? 1 : distance < 60 ? 0.85 : 0.7;
      const stick = 0.85 + Math.random() * 0.3;

      const lockY = swipe || almostSwipe ? HEAD_OFFSET_Y : NECK_OFFSET_Y;

      enemy.aimPosition = {
        x: targetPos.x,
        y: targetPos.y + lockY,
        z: targetPos.z
      };

      enemy.lockSpeed = easing;
      enemy.stickiness = stick;
      enemy.smoothLock = false;
      enemy._internal_autoLock = true;
      enemy._internal_priority = AIM_PRIORITY;

      ["autoLock", "aimHelp", "priority", "headLock", "aimBot", "lockZone", "debugAim"].forEach(k => delete enemy[k]);
    }

    let bestTarget = null;
    let bestScore = 0;

    if (Array.isArray(data.targets)) {
      for (let enemy of data.targets) {
        if (!enemy?.bone?.[HEAD_BONE] || enemy.obstacleBetween) continue;

        const head = enemy.bone[HEAD_BONE];
        const velocity = enemy.velocity || { x: 0, y: 0, z: 0 };
        const distance = calcDistance(player, head);
        if (distance > MAX_DISTANCE) continue;

        let prediction = BASE_PREDICTION;
        if (distance < 30) prediction = 0.6;
        else if (distance > 100) prediction = 1.5;

        const predictedHead = {
          x: head.x + velocity.x * prediction,
          y: head.y + velocity.y * prediction,
          z: head.z + velocity.z * prediction
        };

        if (!isInFOV(predictedHead, player)) continue;

        const heightDiff = Math.abs(predictedHead.y - player.y);
        const heightRatio = heightDiff / distance;
        const proximityScore = (1 / distance) * (1 - heightRatio);

        const aimingAtMe = enemy.aimingAt === player.id || enemy.isFiring;
        const postureBonus = ["standing", "crouching", "prone"].includes(enemy.posture) ? 1.0 : 0.8;
        const finalScore = proximityScore * (aimingAtMe ? 1.5 : 1) * postureBonus;

        if (
          (!squadTargetId && finalScore > bestScore) ||
          (squadTargetId && enemy.id === squadTargetId)
        ) {
          bestScore = finalScore;
          bestTarget = { enemy, pos: predictedHead, dist: distance };
        }
      }
    }

    if (bestTarget) {
      globalThis._squadLockTargetId = bestTarget.enemy.id;
      applySmartLock(bestTarget.enemy, bestTarget.pos, bestTarget.dist, swipeDetected, closeToHeadSwipe);
    } else {
      globalThis._squadLockTargetId = null;
    }

    $done({ body: JSON.stringify(data) });

  } catch (err) {
    $done({});
  }
})();
