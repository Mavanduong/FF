// ==UserScript==
// @name         AutoHeadlockProMax
// @version      1.0
// @description  Ghim đầu toàn diện: vuốt nhẹ, đa tư thế, đa khoảng cách, prediction
// ==/UserScript==

console.log("🎯 AutoHeadlockProMax ACTIVATED");

if (!$response || !$response.body) {
  $done({});
  return;
}

let body = $response.body;

try {
  const HEAD_BONE = "head";
  const MAX_DISTANCE = 120.0; // chỉ xử lý địch trong phạm vi 120m
  const PREDICTION_STRENGTH = 1.2; // hệ số dự đoán chuyển động
  const AIM_PRIORITY = 999;

  let data = JSON.parse(body);

  if (data && data.targets) {
    for (let enemy of data.targets) {
      if (!enemy || !enemy.bone || !enemy.bone[HEAD_BONE]) continue;

      let head = enemy.bone[HEAD_BONE];

      // Tính khoảng cách 3D
      let dx = head.x - data.player.x;
      let dy = head.y - data.player.y;
      let dz = head.z - data.player.z;
      let distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (distance > MAX_DISTANCE) continue; // bỏ qua địch quá xa

      // Xử lý prediction theo hướng chuyển động địch
      let velocity = enemy.velocity || { x: 0, y: 0, z: 0 };
      let predictHead = {
        x: head.x + velocity.x * PREDICTION_STRENGTH,
        y: head.y + velocity.y * PREDICTION_STRENGTH,
        z: head.z + velocity.z * PREDICTION_STRENGTH
      };

      // Ưu tiên nếu địch đang đứng hoặc nhảy
      if (enemy.posture === "jumping" || enemy.posture === "standing") {
        enemy.aimPosition = predictHead;
        enemy.autoLock = true;
        enemy.priority = AIM_PRIORITY;
        enemy.recoilControl = true;
        enemy.lockZone = "HEAD";
        enemy.aimHelp = true;
      }
    }
  }

  body = JSON.stringify(data);
} catch (e) {
  console.log("❌ AutoHeadlockProMax ERROR: " + e);
}

$done({ body });

