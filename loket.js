// ==UserScript==
// @name         AutoHeadlockHardLock v20.0
// @version      20.0
// @description  Hard lock, zero smoothing, instant head follow, predict movement
// @match        *://*/*
// @run-at       document-start
// ==/UserScript==

(() => {
  'use strict';

  const CONFIG = {
    headYOffsetPx: -3.5,
    predictMs: 120,
    bulletDropFactor: 0.001,
    fireOnLock: true,
    fullMagCountOverride: 60,
    multiBulletComp: false
  };

  let STATE = { bursting: false };

  function getPlayer() {
    return window.player || { x:0,y:0,z:0, vx:0, vy:0, vz:0 };
  }

  function getEnemies() {
    return (window.game && game.enemies) ? game.enemies : [];
  }

  function getHead(enemy) {
    if (!enemy) return null;
    if (typeof enemy.getBone === 'function') {
      try { return enemy.getBone('head'); } catch(e){}
    }
    return enemy.head || enemy.position || null;
  }

  function distance(a,b) {
    const dx = (a.x||0)-(b.x||0),
          dy = (a.y||0)-(b.y||0),
          dz = (a.z||0)-(b.z||0);
    return Math.sqrt(dx*dx + dy*dy + dz*dz);
  }

  function chooseTarget(enemies) {
    const player = getPlayer();
    return enemies
      .filter(e => getHead(e))
      .sort((a,b) => distance(player,getHead(a)) - distance(player,getHead(b)))[0] || null;
  }

  function setCrosshair(pos) {
    if (window.game && game.crosshair) {
      game.crosshair.x = pos.x;
      game.crosshair.y = pos.y;
    }
  }

  function fireOnce() {
    if (window.game && typeof game.fire === 'function') {
      try {
        if (game.player && game.player.weapon) {
          game.player.weapon.recoil = 0;
          game.player.weapon.spread = 0;
          game.player.weapon.fireCooldown = 0;
        }
        game.fire();
      } catch(e){}
    }
  }

  function predictHeadPosition(head, enemy) {
    return {
      x: head.x + (enemy.vx || 0) * (CONFIG.predictMs / 1000),
      y: head.y + (enemy.vy || 0) * (CONFIG.predictMs / 1000),
      z: head.z + (enemy.vz || 0) * (CONFIG.predictMs / 1000)
    };
  }

  function applyBulletDrop(aimPos, dist) {
    return { x: aimPos.x, y: aimPos.y - dist * CONFIG.bulletDropFactor };
  }

  function tick() {
    const enemies = getEnemies();
    if (!enemies.length) return requestAnimationFrame(tick);

    const target = chooseTarget(enemies);
    if (!target) return requestAnimationFrame(tick);

    const headRaw = getHead(target);
    const dist = distance(getPlayer(), headRaw);

    let aim = predictHeadPosition(headRaw, target);
    aim = applyBulletDrop(aim, dist);
    aim.y += CONFIG.headYOffsetPx;

    // Đặt thẳng tâm vào đầu
    setCrosshair(aim);

    if (CONFIG.fireOnLock) {
      for (let i = 0; i < CONFIG.fullMagCountOverride; i++) {
        fireOnce();
      }
    }

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
})();
