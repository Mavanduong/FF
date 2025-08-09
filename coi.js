// ==UserScript==
// @name         FixRecoil v3.5 UltraPro GigaStealth + AntiLock Head Pull
// @version      3.5.1
// @description  Chống giật tối thượng + Tự động né đòn khi bị ghim đầu, tăng FPS, phản hồi cực nhanh trong game FPS
// ==/UserScript==

(function () {
  try {
    if (!$response || !$response.body) return $done({});
    let body = $response.body;
    let data = JSON.parse(body);

    if (data?.weaponStats && data?.player && data?.system) {
      const velocity = data.player?.velocity?.magnitude || 0;
      const isJumping = data.player?.posture === "jumping";
      const isAiming = data.player?.isAiming || false;
      const fpsBaseBoost = (data.system.fps || 60) >= 90 ? 1.1 : 1.0; // Ưu tiên xử lý nhanh khi FPS cao
      const stabilityBoost = isAiming ? 1.25 : 1.0;
      const movementFactor = isJumping ? 1.35 : (velocity > 3 ? 1.15 : 1.0);

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

        const randomizer = () => (Math.random() * 0.016 - 0.008); // Nhẹ hơn để vẫn giống người dùng thật

        // Tối ưu từng chỉ số dựa vào hành vi
        weapon.recoil = Math.max(0.10, 0.15 / movementFactor) + randomizer();
        weapon.verticalRecoil = Math.max(0.13, 0.18 / movementFactor) + randomizer();
        weapon.horizontalRecoil = Math.max(0.11, 0.17 / movementFactor) + randomizer();
        weapon.shake = 0.058 + randomizer();
        weapon.spread = 0.0075 + randomizer();

        // Tăng hồi phục và độ ổn định, điều chỉnh theo FPS và trạng thái nhắm
        weapon.recoilRecovery = 190 + Math.random() * 15 * fpsBaseBoost;
        weapon.stability = (140 + Math.random() * 10) * stabilityBoost * fpsBaseBoost;

        delete weapon._backup; // Gỡ dấu vết kỹ thuật để stealth tuyệt đối
      }
    }

    // --- Phần bổ sung: Anti-lock khi bị ghim đầu (giả lập) ---
    // Bạn cần thay game.isEnemyLockingPlayer bằng API hoặc logic detect thực tế game bạn
    if (typeof game !== 'undefined' && typeof game.crosshair !== 'undefined' && typeof game.isEnemyLockingPlayer === 'function') {
      if (game.isEnemyLockingPlayer()) {
        // 90% khả năng kéo lệch tâm crosshair địch để né đòn
        if (Math.random() < 0.9) {
          // Lệch tâm crosshair ngang hoặc dọc ngẫu nhiên 3-6px
          const offsetX = (Math.random() - 0.5) * 6;
          const offsetY = (Math.random() - 0.5) * 6;
          game.crosshair.x += offsetX;
          game.crosshair.y += offsetY;
        }
      }
    }

    body = JSON.stringify(data);
    $done({ body });

  } catch (err) {
    // Nếu lỗi thì vẫn trả về bình thường
    $done({});
  }
})();
