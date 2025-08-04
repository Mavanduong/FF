// ==UserScript==
// @name         FixRecoil v3.0 ProMovement GigaStealth
// @version      3.0
// @description  Chống giật nâng cao: siêu ổn định cả khi nhảy, chạy nhanh, hoặc nhắm bắn liên tục. Giga mode - tránh phát hiện
// ==/UserScript==

(function () {
  try {
    if (!$response || !$response.body) return $done({});
    let body = $response.body;
    let data = JSON.parse(body);

    if (data?.weaponStats && data?.player) {
      const velocity = data.player?.velocity?.magnitude || 0;
      const isJumping = data.player?.posture === "jumping";
      const isAiming = data.player?.isAiming || false;
      const stabilityBoost = isAiming ? 1.2 : 1.0;

      for (let weapon of data.weaponStats) {
        weapon._backup = {
          recoil: weapon.recoil,
          verticalRecoil: weapon.verticalRecoil,
          horizontalRecoil: weapon.horizontalRecoil,
          shake: weapon.shake,
          spread: weapon.spread,
          recoilRecovery: weapon.recoilRecovery,
          stability: weapon.stability,
        };

        // Hệ số động theo hành vi
        let recoilMod = 1.0;
        if (isJumping) recoilMod = 1.25;
        else if (velocity > 3) recoilMod = 1.1;

        const randomizer = () => (Math.random() * 0.02 - 0.01); // tạo cảm giác người thật

        // Tăng cường chống giật có điều chỉnh thông minh
        weapon.recoil = Math.max(0.12, 0.18 / recoilMod) + randomizer();
        weapon.verticalRecoil = Math.max(0.15, 0.22 / recoilMod) + randomizer();
        weapon.horizontalRecoil = Math.max(0.12, 0.2 / recoilMod) + randomizer();
        weapon.shake = 0.065 + randomizer();
        weapon.spread = 0.0085 + randomizer();

        weapon.recoilRecovery = 170 + Math.random() * 20;
        weapon.stability = (130 + Math.random() * 15) * stabilityBoost;

        // Ẩn mọi dấu vết kỹ thuật
        delete weapon._backup;
      }
    }

    body = JSON.stringify(data);
    $done({ body });

  } catch (err) {
    console.error("FixRecoil Error:", err);
    $done({});
  }
})();
