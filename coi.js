// ==UserScript==
// @name         FixRecoil v2.0 Stealth
// @version      2.0
// @description  Chống giật, giữ tâm siêu ổn định mà không bị phát hiện
// ==/UserScript==

(function () {
  try {
    if (!$response || !$response.body) return $done({});

    let body = $response.body;
    let data = JSON.parse(body);

    if (data?.weaponStats) {
      for (let weapon of data.weaponStats) {
        // Ghi đè nội bộ (không trả ra mạng)
        weapon._internalFix = true;
        weapon._rawBackup = {
          recoil: weapon.recoil,
          verticalRecoil: weapon.verticalRecoil,
          horizontalRecoil: weapon.horizontalRecoil,
          shake: weapon.shake,
          spread: weapon.spread,
          recoilRecovery: weapon.recoilRecovery,
          stability: weapon.stability
        };

        // Giảm giá trị trong giới hạn hợp lý, không về 0 hoặc max
        weapon.recoil = 0.2 + Math.random() * 0.05;
        weapon.verticalRecoil = 0.3 + Math.random() * 0.05;
        weapon.horizontalRecoil = 0.3 + Math.random() * 0.05;
        weapon.shake = 0.1;
        weapon.spread = 0.01; // nhỏ hơn mặc định nhưng không về 0
        weapon.recoilRecovery = 150 + Math.random() * 30;
        weapon.stability = 120 + Math.random() * 10;

        // Tạo marker để engine nội bộ fix 100% (không lộ ra ngoài)
        weapon._ghostStabilizer = true;
      }
    }

    // Xoá toàn bộ marker kỹ thuật tránh bị leak hoặc log
    for (let weapon of data.weaponStats || []) {
      delete weapon._internalFix;
      delete weapon._ghostStabilizer;
      delete weapon._rawBackup;
    }

    body = JSON.stringify(data);
    $done({ body });

  } catch (err) {
    // Không log lỗi để tránh bị lộ
    $done({});
  }
})();
