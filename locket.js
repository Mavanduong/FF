// ==UserScript==
// @name         AutoHeadlockProMax v9.0 – UltraSnap Ghost
// @version      9.0.0
// @description  Lock cực mạnh, vuốt là chết, bẻ góc gấp đôi, không bị phát hiện, phù hợp cả đang nhảy hoặc trượt. Ghost logic auto kéo đầu ngay lập tức.
// ==/UserScript==

(function() {
  'use strict';

  const predictionMs = 70;
  const bulletSpeedFactor = 1.25;
  const maxSnapAngle = 25;
  const snapSmoothness = 1.1;
  const recoilCompensation = true;
  const antiAssistOverride = true;

  let lockEnabled = true;

  function getHeadPosition(target) {
    const dx = target.velocity.x * (predictionMs / 1000);
    const dy = target.velocity.y * (predictionMs / 1000);
    const dz = target.velocity.z * (predictionMs / 1000);
    return {
      x: target.head.x + dx * bulletSpeedFactor,
      y: target.head.y + dy * bulletSpeedFactor,
      z: target.head.z + dz * bulletSpeedFactor
    };
  }

  function autoAim(player, target) {
    if (!lockEnabled || !target || !target.head) return;

    const predictedHead = getHeadPosition(target);
    const angleToHead = calculateAngle(player.view, predictedHead);

    if (angleToHead.distance < maxSnapAngle) {
      // Snap cực mạnh, không delay
      player.view.pitch += angleToHead.pitch * snapSmoothness;
      player.view.yaw += angleToHead.yaw * snapSmoothness;
    }

    // Kéo lại khi lệch
    if (antiAssistOverride && angleToHead.distance > 5 && angleToHead.distance < 50) {
      player.view.pitch -= angleToHead.pitch * 0.5;
      player.view.yaw -= angleToHead.yaw * 0.5;
    }

    // Không giật khi đang bắn
    if (recoilCompensation && player.isFiring) {
      player.view.pitch -= 0.14;
    }
  }

  function calculateAngle(view, target) {
    const dx = target.x - view.x;
    const dy = target.y - view.y;
    const dz = target.z - view.z;
    const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
    return {
      pitch: -Math.atan2(dy, distance) * (180 / Math.PI),
      yaw: Math.atan2(dx, dz) * (180 / Math.PI),
      distance: distance
    };
  }

  // Bắt sự kiện người chơi vuốt hoặc bắn
  window.addEventListener('fire', (e) => {
    const player = e.detail.player;
    const target = e.detail.closestEnemy;
    autoAim(player, target);
  });

  window.addEventListener('playerMove', (e) => {
    const player = e.detail.player;
    const target = e.detail.closestEnemy;
    autoAim(player, target);
  });

})();
