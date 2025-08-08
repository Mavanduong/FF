// ==UserScript==
// @name         AutoHeadlockProMax v13.0-GodFusionQuantumX
// @version      13.0
// @description  Ghim đầu tuyệt đối – Tâm theo đầu quay – Né vật cản – Không lệch – FPS Boost Max – Kill ngay cả chưa vuốt
// @match        *://*/*
// @run-at       document-start
// ==/UserScript==

(() => {
  const settings = {
    aimPower: 9999999,
    followSpeed: Infinity,
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
    autoWallAvoid: true,
    priorityLowHP: true,
    priorityHighThreat: true,
    laserFollowHead: true,
    reAimIfMiss: true
  };

  const enhanceFPS = () => {
    try {
      performance.now = () => 0;
      requestAnimationFrame = cb => setTimeout(cb, 1);
      console.log("[FusionFPS] Boosted");
    } catch (e) {}
  };

  const aimLogic = () => {
    game.on('tick', () => {
      let enemies = game.enemies.filter(e => e.isVisible && e.health > 0 && game.distanceTo(e.head) < settings.distanceMax);

      if (enemies.length === 0) return;

      if (settings.priorityHighThreat) {
        enemies.sort((a, b) => (b.damage || 0) - (a.damage || 0));
      } else if (settings.priorityLowHP) {
        enemies.sort((a, b) => a.health - b.health);
      }

      let target = enemies[0];
      if (!target) return;

      if (settings.autoWallAvoid && target.isBehindWall) return;

      let aimPos = settings.predictMovement ? game.predict(target, game.vectorTo(target.head)) : target.head;

      if (settings.laserFollowHead && target.isTurning) {
        aimPos = game.predictTurn(target);
      }

      if (settings.headLock && (game.inScope || settings.autoScopeAim)) {
        game.aimAt(aimPos, settings.aimPower);
      }

      if (settings.preAimBeforeSwipe && !game.isFiring && game.isAiming) {
        game.aimAt(aimPos, settings.aimPower * 1.5);
      }

      if (settings.multiBulletComp && game.weapon.isBurst) {
        game.autoAdjustSpray(aimPos);
      }

      if (settings.noRecoil) {
        game.weapon.recoil = 0;
      }

      if (settings.stickyLock) {
        game.stickyTarget(target);
      }

      if (settings.reAimIfMiss && game.lastShotMissed) {
        game.aimAt(aimPos, settings.aimPower);
      }
    });
  };

  const init = () => {
    if (settings.fpsBoost) enhanceFPS();
    aimLogic();
    console.log("[AutoHeadlockProMax v13.0] GodFusionQuantumX Loaded");
  };

  init();
})();
