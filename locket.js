// ==UserScript==
// @name         AutoHeadlockProMax v9.5 – UltraSnap GhostVision
// @version      9.5.0
// @description  Ghim đầu siêu tốc, không ai phát hiện, AutoGhostSnap cực mạnh, bypass vuốt, delay-free lock-in.
// ==/UserScript==

(function() {
  'use strict';

  const config = {
    predictionMs: 85,
    bulletSpeedFactor: 1.35,
    maxSnapAngle: 30,
    snapSmoothness: 1.08,
    ghostSnapThreshold: 3.0,
    recoilCompensation: true,
    antiAssistOverride: true,
    smartReaim: true,
    visualStealth: true,
    lockCorrectionBoost: 0.6,
  };

  let lockEnabled = true;
  let missCounter = 0;

  function getPredictedHead(target) {
    const t = config.predictionMs / 1000;
    return {
      x: target.head.x + target.velocity.x * t * config.bulletSpeedFactor,
      y: target.head.y + target.velocity.y * t * config.bulletSpeedFactor,
      z: target.head.z + target.velocity.z * t * config.bulletSpeedFactor
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
      distance
    };
  }

  function ghostSnap(player, angle) {
    // Ghim nhanh như chớp - không ai nhìn thấy
    player.view.pitch += angle.pitch * config.snapSmoothness;
    player.view.yaw += angle.yaw * config.snapSmoothness;

    if (config.visualStealth) {
      player.view.pitch += (Math.random() - 0.5) * 0.02;
      player.view.yaw += (Math.random() - 0.5) * 0.02;
    }
  }

  function autoAim(player, target) {
    if (!lockEnabled || !target || !target.head) return;

    const predicted = getPredictedHead(target);
    const angle = calculateAngle(player.view, predicted);

    if (angle.distance < config.maxSnapAngle) {
      ghostSnap(player, angle);

      // Nếu sai vài lần → tăng độ bẻ
      if (angle.distance > config.ghostSnapThreshold) {
        missCounter++;
        if (missCounter >= 3) {
          player.view.pitch += angle.pitch * config.lockCorrectionBoost;
          player.view.yaw += angle.yaw * config.lockCorrectionBoost;
          missCounter = 0;
        }
      } else {
        missCounter = 0;
      }
    }

    // Tự sửa tâm nếu lệch trong khoảng nguy hiểm
    if (config.antiAssistOverride && angle.distance > 4 && angle.distance < 50) {
      player.view.pitch -= angle.pitch * 0.4;
      player.view.yaw -= angle.yaw * 0.4;
    }

    // Chống giật
    if (config.recoilCompensation && player.isFiring) {
      player.view.pitch -= 0.15;
    }
  }

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
