// ==UserScript==
// @name         AutoHeadlockProMax v5.0 – GodLock Edition
// @version      5.0
// @description  Ghim đầu cực nhanh – auto fire – điều chỉnh vuốt – dự đoán chuyển động
// ==/UserScript==

const aimConfig = {
  lockOnHeadForce: 1.0,            // Ghim full lực
  aimSpeed: 1.0,                   // Ghim ngay
  lockUntilDeath: true,
  headZoneRadius: 0.55,           // Vùng đầu nhận diện
  swipeCorrectionRange: 1.2,      // Nhận diện vuốt lỗi
  overPullTolerance: 0.25,        // Dễ bắt swipe sai
  predictionFactor: 0.45,         // Dự đoán chuyển động
};

let isLocked = false;

function isInHeadZone(crosshair, head) {
  const dx = crosshair.x - head.x;
  const dy = crosshair.y - head.y;
  const dz = crosshair.z - head.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) <= aimConfig.headZoneRadius;
}

function predictHead(enemy) {
  const velocity = enemy.velocity || { x: 0, y: 0, z: 0 };
  return {
    x: enemy.head.x + velocity.x * aimConfig.predictionFactor,
    y: enemy.head.y + velocity.y * aimConfig.predictionFactor,
    z: enemy.head.z + velocity.z * aimConfig.predictionFactor,
  };
}

function correctSwipe(crosshair, targetHead, swipeDelta) {
  let corrected = { ...crosshair };
  const dy = targetHead.y - crosshair.y;

  if (Math.abs(dy) < aimConfig.swipeCorrectionRange) {
    if (dy < -aimConfig.overPullTolerance) {
      corrected.y += dy * 1.0; // vuốt vượt → kéo ngược về đầu
    } else if (dy > aimConfig.headZoneRadius) {
      corrected.y += dy * 1.0; // vuốt dưới → nâng nhanh
    } else {
      corrected = targetHead; // vuốt chính xác → dính thẳng
    }
  }

  return corrected;
}

function aimTo(target, current) {
  return {
    x: target.x,
    y: target.y,
    z: target.z
  };
}

function autoFireControl(crosshair, head) {
  if (isInHeadZone(crosshair, head)) {
    if (!isLocked) {
      console.log("🔒 Locked On Head – BẮN");
      isLocked = true;
    }
    triggerFire();
  } else {
    isLocked = false;
  }
}

function triggerFire() {
  console.log("🔫 Bắn!!");
  // game.fire(); ← thay bằng hàm bắn thực tế nếu có
}

game.on('tick', () => {
  const enemy = game.getNearestVisibleEnemy();
  if (!enemy || !enemy.head) return;

  const predictedHead = predictHead(enemy);
  const crosshair = game.getCrosshairPosition();
  const swipeDelta = game.getSwipeDelta();

  const corrected = correctSwipe(crosshair, predictedHead, swipeDelta);
  const newAim = aimTo(corrected, crosshair);

  game.setCrosshairPosition(newAim);

  if (aimConfig.lockUntilDeath) {
    autoFireControl(newAim, predictedHead);
  }
});
