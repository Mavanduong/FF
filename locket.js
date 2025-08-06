// ==UserScript==
// @name         GhostAI_Tactical_v17.9_SwipeMagnet_HybridLock
// @version      17.9
// @description  Vuốt nhẹ là ghim, đạn & tâm hút đầu cực mạnh, không trượt dù vuốt lệch – Auto Re-aim từng viên
// ==/UserScript==

(function () {
  const ghostAIConfig = {
    swipeMagnetForce: 0.999,       // Độ hút khi vuốt
    aimStickyLevel: 0.997,         // Tâm dính đầu
    bulletMagnetCurve: 0.992,      // Quỹ đạo đạn hút về đầu
    snapCorrectionSpeed: 0.985,    // Tốc độ kéo snap về đầu nếu lệch
    flickSensitivity: 0.970,       // Nhạy để sửa khi vuốt lệch
    deadzoneTolerance: 0.02,       // Vùng lệch nhỏ vẫn auto ghim
    delayAfterEachShot: 12,        // Re-aim từng viên
    dualLockEnabled: true          // Hút cả đạn + tâm
  };

  function isEnemy(target) {
    return target && target.type === 'enemy' && target.isVisible;
  }

  function getHeadPosition(enemy) {
    return {
      x: enemy.position.x,
      y: enemy.position.y - enemy.height * 0.85,
      z: enemy.position.z
    };
  }

  function adjustAim(currentAim, targetHead) {
    const dx = targetHead.x - currentAim.x;
    const dy = targetHead.y - currentAim.y;
    const dz = targetHead.z - currentAim.z;

    return {
      x: currentAim.x + dx * ghostAIConfig.snapCorrectionSpeed,
      y: currentAim.y + dy * ghostAIConfig.snapCorrectionSpeed,
      z: currentAim.z + dz * ghostAIConfig.snapCorrectionSpeed
    };
  }

  function magnetizeBullet(bullet, headPos) {
    const bx = headPos.x - bullet.position.x;
    const by = headPos.y - bullet.position.y;
    const bz = headPos.z - bullet.position.z;

    bullet.velocity.x += bx * ghostAIConfig.bulletMagnetCurve;
    bullet.velocity.y += by * ghostAIConfig.bulletMagnetCurve;
    bullet.velocity.z += bz * ghostAIConfig.bulletMagnetCurve;
  }

  game.on('tick', () => {
    const target = game.getClosestEnemy();
    if (!isEnemy(target)) return;

    const headPos = getHeadPosition(target);

    if (ghostAIConfig.dualLockEnabled) {
      // Lock tâm
      const currentAim = game.getCrosshair();
      const newAim = adjustAim(currentAim, headPos);
      game.setCrosshair(newAim);

      // Hút đạn đang bay
      const bullets = game.getActiveBullets();
      bullets.forEach(b => {
        if (!b || !b.velocity) return;
        magnetizeBullet(b, headPos);
      });
    }
  });

  game.on('swipe', (angle, strength) => {
    if (strength < ghostAIConfig.flickSensitivity) return;
    const enemy = game.getClosestEnemy();
    if (!isEnemy(enemy)) return;

    const head = getHeadPosition(enemy);
    const crosshair = game.getCrosshair();
    const dx = head.x - crosshair.x;
    const dy = head.y - crosshair.y;
    const dz = head.z - crosshair.z;

    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (distance < ghostAIConfig.deadzoneTolerance) return;

    // Vuốt lệch → ghim lại
    const fixedAim = adjustAim(crosshair, head);
    game.setCrosshair(fixedAim);
  });

  game.on('shotFired', () => {
    setTimeout(() => {
      const target = game.getClosestEnemy();
      if (!isEnemy(target)) return;
      const head = getHeadPosition(target);
      const current = game.getCrosshair();
      const corrected = adjustAim(current, head);
      game.setCrosshair(corrected);
    }, ghostAIConfig.delayAfterEachShot);
  });

  console.log("🎯 GhostAI Tactical v17.9 Loaded – Vuốt Là Ghim, Hút Cả Đạn Lẫn Tâm 🔥");
})();
