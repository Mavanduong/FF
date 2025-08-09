// ==UserScript==
// @name         FixRecoil v3.5 UltraPro GigaStealth + AntiLock Head Pull V2
// @version      3.5.2
// @description  Chống giật tối thượng + Tự động né đòn khi bị ghim đầu, kéo tâm xuống thân, tăng FPS, phản hồi cực nhanh trong game FPS
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
      const fpsBaseBoost = (data.system.fps || 60) >= 90 ? 1.1 : 1.0;
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

        const randomizer = () => (Math.random() * 0.016 - 0.008);

        weapon.recoil = Math.max(0.10, 0.15 / movementFactor) + randomizer();
        weapon.verticalRecoil = Math.max(0.13, 0.18 / movementFactor) + randomizer();
        weapon.horizontalRecoil = Math.max(0.11, 0.17 / movementFactor) + randomizer();
        weapon.shake = 0.058 + randomizer();
        weapon.spread = 0.0075 + randomizer();

        weapon.recoilRecovery = 190 + Math.random() * 15 * fpsBaseBoost;
        weapon.stability = (140 + Math.random() * 10) * stabilityBoost * fpsBaseBoost;

        delete weapon._backup;
      }
    }

    // --- Anti-lock head pull + kéo tâm xuống thân ---
    if (
      typeof game !== 'undefined' &&
      typeof game.crosshair !== 'undefined' &&
      typeof game.isEnemyLockingPlayer === 'function'
    ) {
      if (game.isEnemyLockingPlayer()) {
        if (Math.random() < 0.99) {  // 95% xác suất hoạt động
          // Lệch random to hơn: 8-12px
          const offsetX = (Math.random() - 0.5) * 18;
          const offsetY = (Math.random() - 0.5) * 18;

          // Kéo tâm xuống thân (thấp hơn đầu khoảng 15px)
          const pullDownPx = 30;

          // Cộng offset + kéo tâm xuống thân
          game.crosshair.x += offsetX * 0.5;    // smoothing nhẹ
          game.crosshair.y += offsetY * 0.5 + pullDownPx * 0.9;
        }
      }
    }

    body = JSON.stringify(data);
    $done({ body });

  } catch (err) {
    $done({});
  }
})();
