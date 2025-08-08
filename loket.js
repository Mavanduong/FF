// ==UserScript==
// @name         AutoHeadlockProMax v14.1 – FaceClampMode
// @version      14.1
// @description  Tự động ghim đầu – AI học lực bắn – Siết mặt tầm gần – Vuốt lệch vẫn dính – AntiBan thông minh
// @match        *://*/*
// @run-at       document-start
// ==/UserScript==

(() => {
  const config = {
    maxLockDistance: 150,
    faceClampRange: 2.5,
    aimSpeed: 999999,
    predictFactor: 1.15,
    bodyParts: ['head'], // luôn ưu tiên head
    antiban: true,
    delayRange: [12, 28],
    clampForce: 10000,
  };

  const rand = (min, max) => Math.random() * (max - min) + min;

  const simulateHumanSwipe = () => {
    return rand(config.delayRange[0], config.delayRange[1]);
  };

  const aimAI = {
    lockTarget(target) {
      const distance = getDistanceTo(target);
      const headPos = target.getBone('head');
      const predicted = predictMovement(target, headPos, config.predictFactor);

      if (distance <= config.faceClampRange) {
        moveCrosshairTo(predicted, config.clampForce); // Ghim cứng vào mặt
      } else {
        moveCrosshairTo(predicted, config.aimSpeed); // Tầm xa nhanh & mượt
      }

      if (config.antiban) {
        setTimeout(() => {
          simulateTapFire();
        }, simulateHumanSwipe());
      } else {
        simulateTapFire();
      }
    },

    shouldLock(target) {
      if (!target || target.health <= 0) return false;
      const dist = getDistanceTo(target);
      return dist <= config.maxLockDistance;
    },
  };

  function getDistanceTo(target) {
    const dx = player.x - target.x;
    const dy = player.y - target.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function predictMovement(target, bone, factor) {
    const dx = target.velocity.x * factor;
    const dy = target.velocity.y * factor;
    return {
      x: bone.x + dx,
      y: bone.y + dy,
    };
  }

  function moveCrosshairTo(pos, speed) {
    game.crosshair.x += (pos.x - game.crosshair.x) / speed;
    game.crosshair.y += (pos.y - game.crosshair.y) / speed;
  }

  function simulateTapFire() {
    if (game.canFire) game.fire();
  }

  game.on('tick', () => {
    const enemies = game.getEnemies();
    let locked = false;

    for (const enemy of enemies) {
      if (aimAI.shouldLock(enemy)) {
        aimAI.lockTarget(enemy);
        locked = true;
        break;
      }
    }

    if (!locked && config.antiban) {
      // Giữ im, tránh hành vi khả nghi
      game.crosshair.x += rand(-0.2, 0.2);
      game.crosshair.y += rand(-0.2, 0.2);
    }
  });
})();
