// ==UserScript==
// @name         AutoHeadlockProMax v1.5
// @version      1.5
// @description  Ghim đầu toàn diện: prediction, ưu tiên tư thế, chặn tường, smooth aim
// ==/UserScript==

console.log("🎯 AutoHeadlockProMax v1.5 ACTIVATED");

if (!$response || !$response.body) {
  $done({});
  return;
}

let body = $response.body;

try {
  const HEAD_BONE = "head";
  const MAX_DISTANCE = 120.0;
  const PREDICTION_FACTOR = 1.25;
  const AIM_PRIORITY = 999;
  const WALL_AVOIDANCE = true;

  let data = JSON.parse(body);
  const player = data.player;

  if (data && data.targets) {
    for (let enemy of data.targets) {
      if (!enemy?.bone?.[HEAD_BONE]) continue;

      const head = enemy.bone[HEAD_BONE];

      // Tính khoảng cách 3D
      const dx = head.x - player.x;
      const dy = head.y - player.y;
      const dz = head.z - player.z;
      const distance = Math.sqrt(dx ** 2 + dy ** 2 + dz ** 2);
      if (distance > MAX_DISTANCE) continue;

      // Dự đoán vị trí đầu
      const v = enemy.velocity || { x: 0, y: 0, z: 0 };
      const predictHead = {
        x: head.x + v.x * PREDICTION_FACTOR,
        y: head.y + v.y * PREDICTION_FACTOR,
        z: head.z + v.z * PREDICTION_FACTOR
      };

      // Kiểm tra vật cản
      if (WALL_AVOIDANCE && enemy.obstacleBetween) continue;

      // Ưu tiên theo tư thế
      const posture = enemy.posture || "";
      const isTargetable = ["standing", "jumping", "crouching"].includes(posture);

      if (isTargetable) {
        enemy.aimPosition = predictHead;
        enemy.autoLock = true;
        enemy.recoilControl = true;
        enemy.lockZone = "HEAD";
        enemy.aimHelp = true;
        enemy.priority = AIM_PRIORITY;

        // Smooth aim hỗ trợ cảm giác mượt
        enemy.smoothLock = true;
        enemy.stickiness = 0.95;
        enemy.dragCompensation = true;
      }
    }
  }

  body = JSON.stringify(data);
} catch (e) {
  console.log("❌ AutoHeadlockProMax v1.5 ERROR:", e);
}

$done({ body });
