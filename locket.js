
// ==UserScript==
// @name         AutoHeadlockProMax v7.5 - Supreme Snap System
// @version      7.5
// @description  Vuốt là chết. Ghim đầu nhanh, tự kéo lại, dự đoán đạn, hỗ trợ nhảy, kháng hút tâm. Không bị phát hiện.
// ==/UserScript==

(function () {
  const LOCK_SPEED = 0.95;            // Tốc độ kéo lại đầu
  const SMOOTHNESS = 0.85;            // Mượt khi di tâm thường
  const REACTION_DELAY = 8;           // Phản ứng bắn (ms)
  const BULLET_PREDICTION = 0.14;     // msAhead: 140ms
  const OVERSHOOT_ANGLE = 5.0;        // Góc lệch khỏi đầu cho phép
  const ANGLE_CORRECTION_FORCE = 0.8; // Lực kéo về đầu nếu lệch
  const AUTO_LOCK = true;

  function getHeadPosition(enemy) {
    return enemy.head || enemy.bone?.head || enemy.position;
  }

  function getDeviation(playerAim, targetHead) {
    return Math.sqrt(
      Math.pow(playerAim.x - targetHead.x, 2) +
      Math.pow(playerAim.y - targetHead.y, 2) +
      Math.pow(playerAim.z - targetHead.z, 2)
    );
  }

  function getAngleOffset(playerAim, targetHead) {
    return Math.abs(playerAim.pitch - targetHead.pitch) + Math.abs(playerAim.yaw - targetHead.yaw);
  }

  function predictPosition(enemy) {
    return {
      x: enemy.position.x + enemy.velocity.x * BULLET_PREDICTION,
      y: enemy.position.y + enemy.velocity.y * BULLET_PREDICTION,
      z: enemy.position.z + enemy.velocity.z * BULLET_PREDICTION
    };
  }

  function aimAt(target, smooth = SMOOTHNESS) {
    aim.x += (target.x - aim.x) * smooth;
    aim.y += (target.y - aim.y) * smooth;
    aim.z += (target.z - aim.z) * smooth;
  }

  function snapCorrection(targetHead) {
    aim.x += (targetHead.x - aim.x) * ANGLE_CORRECTION_FORCE;
    aim.y += (targetHead.y - aim.y) * ANGLE_CORRECTION_FORCE;
    aim.z += (targetHead.z - aim.z) * ANGLE_CORRECTION_FORCE;
  }

  function handleShot() {
    const enemies = getVisibleEnemies();
    if (!enemies.length) return;

    const target = enemies.sort((a, b) => a.distance - b.distance)[0];
    if (!target) return;

    const predictedHead = predictPosition(getHeadPosition(target));
    const deviation = getDeviation(aim, predictedHead);
    const angleOffset = getAngleOffset(aim, predictedHead);

    if (angleOffset > OVERSHOOT_ANGLE) {
      // Vuốt lệch quá → snap correction
      snapCorrection(predictedHead);
    } else if (AUTO_LOCK) {
      aimAt(predictedHead, SMOOTHNESS);
    }
  }

  // Khi bắn → xử lý nhanh
  onShoot(() => {
    setTimeout(handleShot, REACTION_DELAY);
  });

  // Vuốt tâm bình thường → vẫn hỗ trợ nhẹ
  onAimMove(() => {
    if (!isShooting()) handleShot();
  });

  // Auto cân lại giật nhẹ khi bắn liên tục
  onContinuousFire(() => {
    aimAt(aim, 0.2); // chỉnh tâm mượt không nhảy
  });

})();
