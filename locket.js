const aimConfig = {
  lockOnHeadForce: 1.0,            // Ghim lực 100%
  aimSpeed: 1.0,                   // Tốc độ tối đa
  lockUntilDeath: true,
  headZoneRadius: 0.6,            // Vùng nhận diện đầu
  swipeCorrectionRange: 1.2,      // Khoảng điều chỉnh swipe lớn hơn
  overPullTolerance: 0.2          // Dễ nhận swipe vượt hơn
};

let currentTarget = null;
let isLocked = false;

function isInHeadZone(crosshair, headPosition) {
  const dx = crosshair.x - headPosition.x;
  const dy = crosshair.y - headPosition.y;
  const dz = crosshair.z - headPosition.z;
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
  return distance <= aimConfig.headZoneRadius;
}

// Điều chỉnh cực nhanh nếu swipe đúng hướng đầu
function correctSwipe(crosshair, targetHead, swipeDelta) {
  let adjusted = { ...crosshair };

  const dx = targetHead.x - crosshair.x;
  const dy = targetHead.y - crosshair.y;
  const dz = targetHead.z - crosshair.z;

  if (Math.abs(dy) < aimConfig.swipeCorrectionRange) {
    if (dy < -aimConfig.overPullTolerance) {
      adjusted.y += dy * 1.0;  // Vuốt vượt → kéo mạnh
    } else if (dy > aimConfig.headZoneRadius) {
      adjusted.y += dy * 1.0;  // Vuốt dưới → kéo thẳng lên
    } else {
      adjusted = targetHead;   // Đúng đầu → chỉnh ngay lập tức
    }
  }

  return adjusted;
}

// Ghim thẳng không cần mượt
function aimTo(targetHead, currentCrosshair) {
  return {
    x: targetHead.x,
    y: targetHead.y,
    z: targetHead.z
  };
}

function autoFireControl(crosshair, headPos) {
  if (isInHeadZone(crosshair, headPos)) {
    if (!isLocked) {
      console.log("🔒 LOCKED HEAD - BẮN");
      isLocked = true;
    }
    triggerFire();
  } else {
    isLocked = false;
  }
}

function triggerFire() {
  console.log("🔫 BẮN!!");
  // game.fire(); // ← bật nếu có hàm bắn thật
}

game.on('tick', () => {
  const enemy = game.getNearestVisibleEnemy();
  if (!enemy) return;

  const headPos = enemy.head;
  const crosshair = game.getCrosshairPosition();
  const swipeDelta = game.getSwipeDelta();

  const corrected = correctSwipe(crosshair, headPos, swipeDelta);
  const newAim = aimTo(corrected, crosshair);

  game.setCrosshairPosition(newAim);

  if (aimConfig.lockUntilDeath) {
    autoFireControl(newAim, headPos);
  }
});
