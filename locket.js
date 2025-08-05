    lockOnHeadForce: 1.0,         // lực aim dính đầu 100%
    aimSpeed: 0.98,               // tốc độ điều chỉnh aim
    lockUntilDeath: true         // giữ lock cho đến khi địch chết
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

  function correctSwipe(crosshair, targetHead, swipeDelta) {
    let adjusted = { ...crosshair };

    const dx = targetHead.x - crosshair.x;
    const dy = targetHead.y - crosshair.y;
    const dz = targetHead.z - crosshair.z;

    // Nếu vuốt gần đúng đầu
    if (Math.abs(dy) < aimConfig.swipeCorrectionRange) {
      if (dy < -aimConfig.overPullTolerance) {
        // Vuốt vượt đầu → hãm xuống
        adjusted.y += dy * 0.8;
      } else if (dy > aimConfig.headZoneRadius) {
        // Vuốt dưới đầu → nâng lên
        adjusted.y += dy * 0.9;
      } else {
        // Vuốt đúng đầu → không chỉnh
        adjusted = targetHead;
      }
    }

    return adjusted;
  }

  function aimTo(targetHead, currentCrosshair) {
    const dx = targetHead.x - currentCrosshair.x;
    const dy = targetHead.y - currentCrosshair.y;
    const dz = targetHead.z - currentCrosshair.z;

    return {
      x: currentCrosshair.x + dx * aimConfig.aimSpeed,
      y: currentCrosshair.y + dy * aimConfig.aimSpeed,
      z: currentCrosshair.z + dz * aimConfig.aimSpeed
    };
  }

  function autoFireControl(crosshair, headPos) {
    if (isInHeadZone(crosshair, headPos)) {
      if (!isLocked) {
        console.log("🔒 Locked On Head - AutoFire Enabled");
        isLocked = true;
      }
      triggerFire();
    } else {
      isLocked = false;
    }
  }

  function triggerFire() {
    // Gửi lệnh bắn
    console.log("🔫 AutoFire Triggered");
    // game.fire(); ← thay bằng lệnh thực tế nếu có
  }

  game.on('tick', () => {
    const enemy = game.getNearestVisibleEnemy();
    if (!enemy) return;

    const headPos = enemy.head;
    const crosshair = game.getCrosshairPosition();
    const swipeDelta = game.getSwipeDelta();

    // Điều chỉnh theo kiểu vuốt
    const corrected = correctSwipe(crosshair, headPos, swipeDelta);

    // Cập nhật aim
    const newAim = aimTo(corrected, crosshair);
    game.setCrosshairPosition(newAim);

    // Auto fire khi đúng đầu
    if (aimConfig.lockUntilDeath) {
      autoFireControl(newAim, headPos);
    }
  });

})();
