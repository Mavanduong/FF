// ==UserScript==
// @name         Shadowrocket Headlock
// @version      1.0.0
// @description  Ghim đầu tự động bằng cách thay bodyPosition = headPosition trong API enemy
// ==/UserScript==

if (!$response || !$response.body) {
  console.log("❌ Không có response body, bỏ qua");
  $done({});
  return;
}

try {
  const body = $response.body;
  const obj = JSON.parse(body);

  if (obj.enemies && Array.isArray(obj.enemies)) {
    obj.enemies = obj.enemies.map(enemy => {
      if (enemy.headPosition && enemy.bodyPosition) {
        enemy.bodyPosition = { ...enemy.headPosition }; // Ghim body về đầu
        enemy.aimTarget = { ...enemy.headPosition };     // Nếu game có sử dụng aimTarget riêng
      }
      return enemy;
    });

    console.log(`✅ Đã ghim đầu ${obj.enemies.length} enemy`);
  } else {
    console.log("⚠️ Không thấy enemies trong response");
  }

  $done({ body: JSON.stringify(obj) });
} catch (e) {
  console.log("❌ Lỗi xử lý headlock:", e);
  $done({});
}
