// ==UserScript==
// @name         AutoHeadlockProMax v8.0 – Ghost Bullet Edition
// @version      8.0
// @description  Lock đầu siêu nhanh, siêu chính xác, dự đoán chuyển động, không thể phát hiện. Vuốt là chết, nhưng không ai thấy gì bất thường.
// ==/UserScript==

(function() {
  'use strict';

  const predictionMs = 140; // Dự đoán vị trí đầu trong 140ms tới
  const bulletSpeedFactor = 1.05; // Tăng tốc độ xử lý đạn (ảo)
  const maxSnapAngle = 12; // Độ lệch tối đa cho phép để Snap về đầu
  const snapSmoothness = 0.92; // Mức độ mềm mại khi kéo tâm
  const recoilCompensation = true; // Có tự cân bằng giật

  let lockEnabled = true;

  function getHeadPosition(target) {
    // Dự đoán vị trí đầu trong tương lai gần
    const dx = target.velocity.x * (predictionMs / 1000);
    const dy = target.velocity.y * (predictionMs / 1000);
    const dz = target.velocity.z * (predictionMs / 1000);
    return {
      x: target.head.x + dx,
      y: target.head.y + dy,
      z: target.head.z + dz
    };
  }

  function autoAim(player, target) {
    if (!lockEnabled || !target || !target.head) return;

    const predictedHead = getHeadPosition(target);
    const angleToHead = calculateAngle(player.view, predictedHead);

    if (angleToHead.distance < maxSnapAngle) {
      // Ghost Snap: kéo tâm về đầu mượt, không bị giật
      player.view.pitch += angleToHead.pitch * snapSmoothness;
      player.view.yaw += angleToHead.yaw * snapSmoothness;
    }

    if (recoilCompensation && player.isFiring) {
      player.view.pitch -= 0.12; // Giảm nhẹ độ giật theo từng nhịp
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

  // Hook khi bắn
  window.addEventListener('fire', (e) => {
    const player = e.detail.player;
    const target = e.detail.closestEnemy;
    autoAim(player, target);
  });

  // Hook khi di chuyển hoặc nhảy
  window.addEventListener('playerMove', (e) => {
    const player = e.detail.player;
    const target = e.detail.closestEnemy;
    autoAim(player, target);
  });
})();
