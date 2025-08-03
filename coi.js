// ==UserScript==
// @name         FixRecoil v2.1 ProMovement Stealth
// @version      2.1
// @description  Chống giật siêu mượt cả khi nhảy và di chuyển nhanh - không lộ
// ==/UserScript==

(function () {
  try {
    if (!$response || !$response.body) return $done({});
    let body = $response.body;
    let data = JSON.parse(body);

    if (data?.weaponStats && data?.player) {
      const movementSpeed = data.player?.velocity?.magnitude || 0;
      const isJumping = data.player?.posture === "jumping";

      for (let weapon of data.weaponStats) {
        // Backup gốc để tránh mất dữ liệu
        weapon._rawBackup = {
          recoil: weapon.recoil,
          verticalRecoil: weapon.verticalRecoil,
          horizontalRecoil: weapon.horizontalRecoil,
          shake: weapon.shake,
          spread: weapon.spread,
          recoilRecovery: weapon.recoilRecovery,
          stability: weapon.stability
        };

        // Điều chỉnh động dựa theo trạng thái
        let recoilFactor = 1.0;
        if (isJumping) {
          recoilFactor = 1.25; // nhảy = khó kiểm soát hơn
        } else if (movementSpeed > 2.5) {
          recoilFactor = 1.1; // chạy nhanh = tăng rung
        }

        // Áp dụng recoil thấp hơn theo factor nhưng không về 0
        weapon.recoil = Math.max(0.15, 0.2 * (1 / recoilFactor)) + Math.random() * 0.03;
        weapon.verticalRecoil = Math.max(0.2, 0.25 * (1 / recoilFactor)) + Math.random() * 0.03;
        weapon.horizontalRecoil = Math.max(0.2, 0.25 * (1 / recoilFactor)) + Math.random() * 0.03;
        weapon.shake = 0.08;
        weapon.spread = 0.009;
        weapon.recoilRecovery = 160 + Math.random() * 25;
        weapon.stability = 125 + Math.random() * 10;

        weapon._internalFix = true;
        weapon._ghostStabilizer = true;
      }
    }

    // Xoá các marker kỹ thuật trước khi trả về
    for (let weapon of data.weaponStats || []) {
      delete weapon._internalFix;
      delete weapon._ghostStabilizer;
      delete weapon._rawBackup;
    }

    body = JSON.stringify(data);
    $done({ body });

  } catch (err) {
    $done({});
  }
})();
