// ==UserScript==
// @name         HeadlockAI v1.0 Ultra Fast
// @description  Headlock cực nhanh, thông minh, có AI fallback khi game không gửi dữ liệu.
// ==/UserScript==

(function () {
  try {
    if (!$response?.body) return $done({});

    let body = JSON.parse($response.body);

    // ====== PHƯƠNG ÁN A: CÓ DỮ LIỆU VỊ TRÍ ĐỊCH ======
    if (body.enemies && Array.isArray(body.enemies)) {
      body.enemies = body.enemies.map(enemy => {
        // Nếu có head_position => lock luôn vào đầu
        if (enemy.head_position) {
          enemy.position = enemy.head_position;
        } 
        // Nếu không có => dùng phương án B
        else if (enemy.position) {
          enemy.position = estimateHeadFromBody(enemy.position);
        }
        return enemy;
      });
    }

    // Trả lại body sau khi xử lý
    return $done({ body: JSON.stringify(body) });

    // ====== PHƯƠNG ÁN B: KHÔNG CÓ HEAD => ƯỚC LƯỢNG ======
    function estimateHeadFromBody(bodyPos) {
      // Đây là AI Fallback rất nhẹ: tăng cao tọa độ Y giả lập đầu
      return {
        x: bodyPos.x,
        y: bodyPos.y + 1.6, // nâng đầu lên so với thân
        z: bodyPos.z
      };
    }

  } catch (e) {
    console.log("HeadlockAI error:", e);
    return $done({});
  }
})();
