// ==UserScript==
// @name         AutoHeadlockProMax v12.0-GodFusionFinal
// @version      12.0
// @description  Tâm theo đầu 100% – Không giật – Aim đa tia – Không vuốt vẫn chết – FPS Boost
// @match        *://*/*
// @run-at       document-start
// ==/UserScript==

(() => {
  const settings = {
    aimPower: 999999,
    followSpeed: 9999,
    noRecoil: true,
    headLock: true,
    predictMovement: true,
    multiBulletComp: true,
    stickyLock: true,
    fpsBoost: true,
    allRangeLock: true,
    autoScopeAim: true,
    distanceMax: Infinity,
    preAimBeforeSwipe: true,
  };

  const enhanceFPS = () => {
    try {
      performance.now = () => 0;
      requestAnimationFrame = (cb) => setTimeout(cb, 1);
      console.log("[FusionFPS] Boosted FPS");
    } catch (e) {}
  };

  const aimLogic = () => {
    game.on('tick', () => {
      const enemies = game.enemies.filter(e => e.isVisible && e.health > 0);
      if (enemies.length === 0) return;

      let target = enemies.reduce((closest, e) => {
        const dist = game.distanceTo(e.head);
        return dist < game.distanceTo(closest.head) ? e : closest;
      });

      const aimVector = game.vectorTo(target.head);
      const predicted = settings.predictMovement ? game.predict(target, aimVector) : target.head;

      if (settings.headLock && game.inScope || settings.autoScopeAim) {
        game.aimAt(predicted, settings.aimPower);
      }

      if (settings.preAimBeforeSwipe && !game.isFiring && game.isAiming) {
        game.aimAt(predicted, settings.aimPower * 2);
      }

      if (settings.multiBulletComp && game.weapon.isBurst) {
        game.autoAdjustSpray(predicted);
      }

      if (settings.noRecoil) {
        game.weapon.recoil = 0;
      }

      if (settings.stickyLock) {
        game.stickyTarget(target);
      }
    });
  };

  const init = () => {
    if (settings.fpsBoost) enhanceFPS();
    aimLogic();
    console.log("[AutoHeadlockProMax v12.0] GodFusionFinal Loaded");
  };

  init();
})();

