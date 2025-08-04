// ==UserScript==
// @name         AutoHeadlockProMax v3.99 ULTIMATE
// @version      3.99
// @description  Ghim đầu tuyệt đối: squad lock, prediction, vật cản, nhảy, offset sway, delay swipe, cổ/đầu switch, tăng tốc, giảm tỏa đạn
// ==/UserScript==

(function () {
  try {
    if (!$response || !$response.body) return $done({});
    let body = $response.body;
    let data = JSON.parse(body);

    const HEAD_BONE = "head";
    const MAX_DISTANCE = 180;
    const BASE_FOV = 65;
    const BASE_PREDICTION = 1.35;
    const AIM_PRIORITY = 9999;
    const HEAD_OFFSET_Y = 0.04;
    const NECK_OFFSET_Y = -0.08;
    const MICRO_SWAY = 0.01 + Math.random() * 0.01;

    const player = data.player;
    const scopeZoom = player.scopeZoom || 1;
    const adjustedFOV = BASE_FOV / scopeZoom;
    const swipeDetected = player.lastSwipeTime && Date.now() - player.lastSwipeTime < 350;
    const swipeForce = swipeDetected ? 1.3 : 1.0;

    const squadTargetId = globalThis._squadLockTargetId || null;

    function isInFOV(target, player, maxAngle = adjustedFOV) {
      const dx = target.x - player.x, dy = target.y - player.y, dz = target.z - player.z;
      const dist = Math.sqrt(dx ** 2 + dy ** 2 + dz ** 2);
      if (dist === 0) return false;
      const forward = player.direction || { x: 0, y: 0, z: 1 };
      const dot = (dx * forward.x + dy * forward.y + dz * forward.z) / dist;
      const angle = Math.acos(dot) * (180 / Math.PI);
      return angle < maxAngle;
    }

    function calcDistance(a, b) {
      return Math.sqrt(
        (b.x - a.x) ** 2 +
        (b.y - a.y) ** 2 +
        (b.z - a.z) ** 2
      );
    }

    function applyUltimateLock(enemy, targetPos, distance, swipe) {
      const swayX = (Math.random() - 0.5) * MICRO_SWAY;
      const swayY = (Math.random() - 0.5) * MICRO_SWAY;
      const targetY = targetPos.y + (swipe ? HEAD_OFFSET_Y : NECK_OFFSET_Y) + swayY;

      enemy.aimPosition = {
        x: targetPos.x + swayX,
        y: targetY,
        z: targetPos.z
      };

      enemy.lockSpeed = 1.0 * swipeForce;
      enemy.stickiness = 1.1 * swipeForce;
      enemy.smoothLock = false;
      enemy._internal_autoLock = true;
      enemy._internal_priority = AIM_PRIORITY;

      enemy.bulletSpeedMultiplier = 1.1; // tăng tốc ra đạn 10%
      enemy.spreadReduction = 0.3;       // giảm tỏa đạn 30%

      [
        "autoLock", "aimHelp", "priority", "headLock",
        "aimBot", "lockZone", "debugAim"
      ].forEach(k => delete enemy[k]);
    }

    let bestTarget = null;
    let bestScore = 0;

    if (Array.isArray(data.targets)) {
      for (let enemy of data.targets) {
        if (!enemy?.bone?.[HEAD_BONE]) continue;

        const head = enemy.bone[HEAD_BONE];
        const velocity = enemy.velocity || { x: 0, y: 0, z: 0 };
        const distance = calcDistance(player, head);
        if (distance > MAX_DISTANCE) continue;

        let prediction = BASE_PREDICTION;
        if (distance < 30) prediction = 0.6;
        else if (distance > 130) prediction = 1.8;

        const predictedHead = {
          x: head.x + velocity.x * prediction,
          y: head.y + velocity.y * prediction,
          z: head.z + velocity.z * prediction
        };

        if (!isInFOV(predictedHead, player)) continue;

        const heightDiff = Math.abs(predictedHead.y - player.y);
        const proximityScore = (1 / distance) * (1 - (heightDiff / distance));
        const aimingAtMe = enemy.aimingAt === player.id || enemy.isFiring;
        const postureBonus = ["standing", "crouching", "prone", "jumping"].includes(enemy.posture) ? 1.0 : 0.7;

        const finalScore = proximityScore * (aimingAtMe ? 1.7 : 1.0) * postureBonus;

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
      applyUltimateLock(bestTarget.enemy, bestTarget.pos, bestTarget.dist, swipeDetected);
    } else {
      globalThis._squadLockTargetId = null;
    }

    $done({ body: JSON.stringify(data) });
  } catch (err) {
    $done({});
  }
})();
