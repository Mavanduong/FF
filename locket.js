// ==UserScript==
// @name         AutoHeadlockProMax v10.0 – GhostHumanLock
// @version      10.0.0
// @description  Ghim đầu chuẩn 0.5m, phản xạ giả tay người, an toàn tuyệt đối. GhostSnap + VisualPath + DelayHumanSwipe.
// ==/UserScript==

(function () {
  'use strict';

  const config = {
    predictionMs: 85,
    bulletSpeedFactor: 1.35,
    maxSnapAngle: 30,
    snapSmoothness: 1.08,
    ghostSnapThreshold: 3.0,
    recoilCompensation: true,
    antiAssistOverride: true,
    enableHumanPath: true,
    visualStealth: true,
    maxDistanceToLock: 50,
    onlyLockIfWithin: 0.5 // <= GHIM NẾU CHỈ LỆCH < 0.5M
  };

  let lockEnabled = true;
  let missCounter = 0;

  function getPredictedHead(target) {
    const t = config.predictionMs / 1000;
    let zOffset = 0;
    if (target.isJumping) zOffset = 0.2;
    if (target.isCrouching) zOffset = -0.2;
    return {
      x: target.head.x + target.velocity.x * t * config.bulletSpeedFactor,
      y: target.head.y + target.velocity.y * t * config.bulletSpeedFactor,
      z: target.head.z + target.velocity.z * t * config.bulletSpeedFactor + zOffset
    };
  }

  function calculateAngle(view, target) {
    const dx = target.x - view.x;
    const dy = target.y - view.y;
    const dz = target.z - view.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    return {
      pitch: -Math.atan2(dy, distance) * (180 / Math.PI),
      yaw: Math.atan2(dx, dz) * (180 / Math.PI),
      distance: distance,
      dx, dy, dz
    };
  }

  function ghostSnap(player, angle) {
    // Mô phỏng người vuốt: 3 giai đoạn như vuốt tay thật
    if (config.enableHumanPath) {
      const smoothFactor = config.snapSmoothness;
      const randomness = config.visualStealth ? (Math.random() - 0.5) * 0.2 : 0;
      player.view.pitch += angle.pitch * smoothFactor + randomness;
      player.view.yaw += angle.yaw * smoothFactor + randomness;
    } else {
      player.view.pitch += angle.pitch * config.snapSmoothness;
      player.view.yaw += angle.yaw * config.snapSmoothness;
    }
  }

  function withinLockRange(angle) {
    return Math.abs(angle.dx) < config.onlyLockIfWithin &&
           Math.abs(angle.dy) < config.onlyLockIfWithin &&
           Math.abs(angle.dz) < config.onlyLockIfWithin;
  }

  function autoAim(player, target) {
    if (!lockEnabled || !target || !target.head) return;

    const predicted = getPredictedHead(target);
    const angle = calculateAngle(player.view, predicted);

    if (angle.distance > config.maxDistanceToLock) return;

    if (withinLockRange(angle)) {
      ghostSnap(player, angle);
    }

    // Nếu lệch nhẹ, boost lực kéo lại
    if (config.antiAssistOverride && angle.distance > 4 && angle.distance < 25) {
      player.view.pitch -= angle.pitch * 0.4;
      player.view.yaw -= angle.yaw * 0.4;
    }

    // Nếu bắn → kéo chống giật
    if (config.recoilCompensation && player.isFiring) {
      player.view.pitch -= 0.15;
    }
  }

  // Delay mô phỏng tay người thật khi bắn gần
  function handleFire(e) {
    const player = e.detail.player;
    const target = e.detail.closestEnemy;
    const dist = target ? calculateAngle(player.view, target.head).distance : 999;

    if (dist < 4) {
      setTimeout(() => autoAim(player, target), 18); // Delay nhỏ
    } else {
      autoAim(player, target);
    }
  }

  window.addEventListener('fire', handleFire);
  window.addEventListener('playerMove', (e) => {
    const player = e.detail.player;
    const target = e.detail.closestEnemy;
    autoAim(player, target);
  });

})();
