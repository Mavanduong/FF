// ==UserScript==
// @name         AutoHeadlockProMax v2.5 Swipe100%Headshot
// @version      2.5
// @description  Vuốt = 100% Ghim Đầu + Anti-phát hiện + Fake swipe aim assist
// ==/UserScript==

(function () {
  try {
    if (!$response || !$response.body) return $done({});
    let body = $response.body;
    const HEAD_BONE = "head";
    const MAX_DISTANCE = 135;
    const PREDICTION = 1.35;
    const AIM_PRIORITY = 1000;
    const FOV_ANGLE = 50;
    const MAX_SPECTATORS = 0;

    let data = JSON.parse(body);
    const player = data.player;
    if (data?.spectators > MAX_SPECTATORS) return $done({ body });

    function isInFOV(enemyPos, player, maxAngle = FOV_ANGLE) {
      const dx = enemyPos.x - player.x,
        dy = enemyPos.y - player.y,
        dz = enemyPos.z - player.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist === 0) return false;
      const forward = player.direction || { x: 0, y: 0, z: 1 };
      const dot = (dx * forward.x + dy * forward.y + dz * forward.z) / dist;
      const angle = Math.acos(dot) * (180 / Math.PI);
      return angle < maxAngle;
    }

    function applySwipeHeadlock(enemy, targetPos) {
      // Swipe-mimic jitter nhỏ giúp hợp pháp hóa hướng tay
      const swipeJitterX = (Math.random() - 0.5) * 0.005;
      const swipeJitterY = (Math.random() - 0.5) * 0.005;

      const locked = {
        x: targetPos.x + swipeJitterX,
        y: targetPos.y + swipeJitterY,
        z: targetPos.z
      };

      // Kích hoạt khóa tự nhiên khi vuốt: cực kỳ mượt
      enemy.aimPosition = locked;
      enemy.smoothLock = true;
      enemy.lockSpeed = 0.96 + Math.random() * 0.03;
      enemy.stickiness = 0.93 + Math.random() * 0.05;
      enemy.swipeTracking = true; // Nội bộ hỗ trợ swipe

      // Nội bộ
      enemy._internal_autoLock = true;
      enemy._internal_priority = AIM_PRIORITY;

      // Xóa trường đáng nghi
      const riskyKeys = [
        "autoLock", "aimHelp", "lockZone", "recoilControl",
        "aimBot", "headLock", "debugAim", "priority"
      ];
      riskyKeys.forEach(k => delete enemy[k]);
    }

    if (Array.isArray(data.targets)) {
      for (let enemy of data.targets) {
        if (!enemy?.bone?.[HEAD_BONE]) continue;
        if (enemy.obstacleBetween) continue;

        const head = enemy.bone[HEAD_BONE];
        const dx = head.x - player.x;
        const dy = head.y - player.y;
        const dz = head.z - player.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (distance > MAX_DISTANCE) continue;

        const velocity = enemy.velocity || { x: 0, y: 0, z: 0 };
        const predictHead = {
          x: head.x + velocity.x * PREDICTION,
          y: head.y + velocity.y * PREDICTION,
          z: head.z + velocity.z * PREDICTION
        };

        if (!isInFOV(predictHead, player)) continue;
        if (!["standing", "crouching", "jumping", "prone"].includes(enemy.posture)) continue;

        // Ghim ngay nếu có swipe
        if (player.inputMethod === "swipe" || player.recentTouchAngleDelta > 1.0) {
          applySwipeHeadlock(enemy, predictHead);
        }
      }
    }

    body = JSON.stringify(data);
    $done({ body });

  } catch (err) {
    $done({});
  }
})();
