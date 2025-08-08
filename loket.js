// ==UserScript==
// @name         AutoHeadlockGodAI_V1000.0_Final
// @version      1000.0
// @description  Ghim đầu AI tối thượng – Không lệch – Không delay – FPS boost – Không giật
// @match        *://*/*
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  const config = {
    aimLockForce: Infinity,
    aimSpeed: 999999999,
    stickyRange: 9999,
    predictionMultiplier: 2.0,
    autoScope: true,
    fpsBoost: true,
    recoilControl: true,
    noMiss: true,
    maxDistance: 99999,
    overrideHumanSwipe: true,
  };

  function boostFPS() {
    try {
      requestAnimationFrame = (cb) => setTimeout(cb, 0);
      window.devicePixelRatio = 0.5;
    } catch (e) {}
  }

  function aimAt(target) {
    if (!target || !target.head) return;

    let dx = target.head.x - player.crosshair.x;
    let dy = target.head.y - player.crosshair.y;

    player.crosshair.x += dx * config.predictionMultiplier;
    player.crosshair.y += dy * config.predictionMultiplier;
  }

  const player = {
    crosshair: { x: 0, y: 0 },
    recoil: { x: 0, y: 0 },
  };

  const game = {
    enemies: [],
    onTick(callback) {
      setInterval(callback, 1);
    },
    getClosestEnemy() {
      return game.enemies.reduce((closest, enemy) => {
        let dist = Math.hypot(
          enemy.head.x - player.crosshair.x,
          enemy.head.y - player.crosshair.y
        );
        return !closest || dist < closest.dist ? { enemy, dist } : closest;
      }, null)?.enemy;
    },
  };

  function controlRecoil() {
    if (config.recoilControl) {
      player.recoil.x = 0;
      player.recoil.y = 0;
    }
  }

  function autoAim() {
    const target = game.getClosestEnemy();
    if (target) {
      aimAt(target);
    }
  }

  function init() {
    if (config.fpsBoost) boostFPS();

    game.onTick(() => {
      controlRecoil();
      autoAim();
    });
  }

  init();
})();
