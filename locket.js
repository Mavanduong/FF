// ==UserScript==
// @name         AutoHeadlockProMax v10.5 – SwipeToHeadLock
// @version      10.5.0
// @description  Vuốt là auto aim dính đầu, lock không buông cho đến khi mục tiêu chết. GhostSnap + StickyTrack.
// ==/UserScript==

(function () {
  'use strict';

  const config = {
    predictionMs: 85,
    bulletSpeedFactor: 1.35,
    maxSnapAngle: 30,
    snapSmoothness: 1.05,
    recoilCompensation: true,
    antiAssistOverride: true,
    enableHumanPath: true,
    visualStealth: true,
    lockDistanceMax: 55,
    onlyLockIfWithin: 0.5
  };

  let lockEnabled = true;
  let lockedTarget = null;

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
      distance,
      dx, dy, dz
    };
  }

  function withinLockRange(angle) {
    return Math.abs(angle.dx) < config.onlyLockIfWithin &&
           Math.abs(angle.dy) < config.onlyLockIfWithin &&
           Math.abs(angle.dz) < config.onlyLockIfWithin;
  }

  function ghostSnap(player, angle) {
    const r = config.visualStealth ? (Math.random() - 0.5) * 0.2 : 0;
    player.view.pitch += angle.pitch * config.snapSmoothness + r;
    player.view.yaw += angle.yaw * config.snapSmoothness + r;
  }

  function autoAim(player, target) {
    if (!lockEnabled || !target || !target.head) return;

    const predicted = getPredictedHead(target);
    const angle = calculateAngle(player.view, predicted);
    if (angle.distance > config.lockDistanceMax) return;

    if (withinLockRange(angle)) {
      ghostSnap(player, angle);
    }

    // Giữ lock nếu còn mục tiêu
    if (config.antiAssistOverride && angle.distance > 2 && angle.distance < 40) {
      player.view.pitch -= angle.pitch * 0.3;
      player.view.yaw -= angle.yaw * 0.3;
    }

    if (config.recoilCompensation && player.isFiring) {
      player.view.pitch -= 0.15;
    }
  }

  // Bắt đầu khóa khi vuốt vào gần đầu
  window.addEventListener('playerMove', (e) => {
    const player = e.detail.player;
    const target = e.detail.closestEnemy;

    if (!target || !target.head) return;

    const predicted = getPredictedHead(target);
    const angle = calculateAngle(player.view, predicted);

    if (withinLockRange(angle)) {
      lockedTarget = target;
    }

    if (lockedTarget && !lockedTarget.isDead) {
      autoAim(player, lockedTarget);
    } else {
      lockedTarget = null;
    }
  });

  window.addEventListener('fire', (e) => {
    const player = e.detail.player;
    const target = lockedTarget || e.detail.closestEnemy;
    autoAim(player, target);
  });

})();
