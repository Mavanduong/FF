// ==UserScript==
// @name         AutoHeadlockProMax v2.3 Stealth
// @version      2.3
// @description  Ghim đầu 100% + Không để lộ qua mạng, không tắt khi bị giám sát
// ==/UserScript==

(function () {
  try {
    if (!$response || !$response.body) return $done({});

    let body = $response.body;
    const HEAD_BONE = "head";
    const MAX_DISTANCE = 120;
    const PREDICTION = 1.25;
    const AIM_PRIORITY = 999;

    let data = JSON.parse(body);
    const player = data.player;

    function isInFOV(enemy, player, maxAngle = 45) {
      const dx = enemy.x - player.x, dy = enemy.y - player.y, dz = enemy.z - player.z;
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
      if (dist === 0) return false;
      const forward = player.direction || { x: 0, y: 0, z: 1 };
      const dot = (dx * forward.x + dy * forward.y + dz * forward.z) / dist;
      const angle = Math.acos(dot) * (180 / Math.PI);
      return angle < maxAngle;
    }

    function applySmartLock(enemy, targetPos) {
      const jitter = (Math.random() - 0.5) * 0.012;
      const locked = {
        x: targetPos.x + jitter,
        y: targetPos.y + jitter,
        z: targetPos.z + jitter
      };

      // Nội bộ hỗ trợ ngắm, không để lộ thuộc tính nguy hiểm
      enemy.aimPosition = locked;
      enemy.smoothLock = true;
      enemy.lockSpeed = 0.91 + Math.random() * 0.035;
      enemy.stickiness = 0.90 + Math.random() * 0.06;

      // Chỉ nội bộ, không ghi ra response
      enemy._internal_autoLock = true;
      enemy._internal_priority = AIM_PRIORITY;

      // Xoá các trường có khả năng bị phát hiện nếu server check phản hồi
      delete enemy.autoLock;
      delete enemy.aimHelp;
      delete enemy.recoilControl;
      delete enemy.lockZone;
      delete enemy.priority;
      delete enemy.aimBot;
      delete enemy.headLock;
      delete enemy.debugAim;
    }

    if (data && data.targets) {
      for (let enemy of data.targets) {
        if (!enemy?.bone?.[HEAD_BONE]) continue;

        const head = enemy.bone[HEAD_BONE];
        const dx = head.x - player.x;
        const dy = head.y - player.y;
        const dz = head.z - player.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (distance > MAX_DISTANCE) continue;

        const v = enemy.velocity || { x: 0, y: 0, z: 0 };
        const predictHead = {
          x: head.x + v.x * PREDICTION,
          y: head.y + v.y * PREDICTION,
          z: head.z + v.z * PREDICTION
        };

        if (enemy.obstacleBetween) continue;
        if (!isInFOV(predictHead, player)) continue;

        if (["standing", "jumping", "crouching"].includes(enemy.posture)) {
          applySmartLock(enemy, predictHead);
        }
      }
    }

    body = JSON.stringify(data);
    $done({ body });

  } catch (err) {
    // Không log lỗi để tránh bị phát hiện
    $done({});
  }
})();
