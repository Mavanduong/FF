// ==UserScript==
// @name         AutoHeadlockProMax v2.4 UltraStealth
// @version      2.4
// @description  Ghim đầu 100% + Anti-detect + Fake smooth lock + Delay giám sát
// ==/UserScript==

(function () {
  try {
    if (!$response || !$response.body) return $done({});
    let body = $response.body;
    const HEAD_BONE = "head";
    const MAX_DISTANCE = 130;
    const PREDICTION = 1.33;
    const AIM_PRIORITY = 999;
    const FOV_ANGLE = 40;
    const MAX_SPECTATORS = 0; // Chống lộ khi có người xem

    let data = JSON.parse(body);
    const player = data.player;

    if (data?.spectators > MAX_SPECTATORS) {
      // Delay auto lock khi có người giám sát
      return $done({ body });
    }

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

    function applyUltraLock(enemy, targetPos) {
      const jitter = (Math.random() - 0.5) * 0.01;
      const locked = {
        x: targetPos.x + jitter,
        y: targetPos.y + jitter,
        z: targetPos.z + jitter
      };

      // Tăng độ mượt và tự nhiên
      enemy.aimPosition = locked;
      enemy.smoothLock = true;
      enemy.lockSpeed = 0.92 + Math.random() * 0.04;
      enemy.stickiness = 0.91 + Math.random() * 0.05;

      // Cờ nội bộ, không ghi ra ngoài response
      enemy._internal_autoLock = true;
      enemy._internal_priority = AIM_PRIORITY;

      // Xoá mọi trường khả nghi
      const suspiciousKeys = [
        "autoLock", "aimHelp", "recoilControl", "lockZone", "priority",
        "aimBot", "headLock", "debugAim"
      ];
      for (const key of suspiciousKeys) {
        if (enemy.hasOwnProperty(key)) delete enemy[key];
      }
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
        if (!["standing", "jumping", "crouching"].includes(enemy.posture)) continue;

        applyUltraLock(enemy, predictHead);
      }
    }

    body = JSON.stringify(data);
    $done({ body });

  } catch (e) {
    // Không log lỗi để tránh bị phát hiện
    $done({});
  }
})();
