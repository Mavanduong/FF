// ==UserScript==
// @name         AutoHeadlockHardLock v20.1
// @version      20.1
// @description  Hard lock, zero smoothing, instant head follow, predict movement + close-range body/leg skip
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
    multiBulletComp: false,
    closeRangeMeters: 3,       // Giới hạn khoảng cách gần
    bodyHitboxTolerance: 1.0   // Sai số để xác định lock vào thân/chân
  };

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

  function getBody(enemy) {
    if (!enemy) return null;
    if (typeof enemy.getBone === 'function') {
      try { return enemy.getBone('chest') || enemy.getBone('spine'); } catch(e){}
    }
    return enemy.body || enemy.position || null;
  }

  function getLeg(enemy) {
    if (!enemy) return null;
    if (typeof enemy.getBone === 'function') {
      try { return enemy.getBone('pelvis') || enemy.getBone('left_leg'); } catch(e){}
    }
    return enemy.leg || enemy.position || null;
  }

  function distance(a,b) {
    const dx = (a.x||0)-(b.x||0),
          dy = (a.y||0)-(b.y||0),
          dz = (a.z||0)-(b.z||0);
    return Math.sqrt(dx*dx + dy*dy + dz*dz);
  }

  function isBodyOrLegLocked(headPos, bodyPos, legPos, crosshairPos) {
    const distBody = distance(crosshairPos, bodyPos || {});
    const distLeg  = distance(crosshairPos, legPos || {});
    return (distBody < CONFIG.bodyHitboxTolerance || distLeg < CONFIG.bodyHitboxTolerance);
  }

  function chooseTarget(enemies) {
    const player = getPlayer();
    const crosshair = window.game && game.crosshair ? game.crosshair : { x:0, y:0, z:0 };

    return enemies
      .filter(e => {
        const head = getHead(e);
        if (!head) return false;

        const dist = distance(player, head);

        if (dist <= CONFIG.closeRangeMeters) {
          // Nếu gần thì bỏ qua thân/chân
          const body = getBody(e);
          const leg  = getLeg(e);
          if (isBodyOrLegLocked(head, body, leg, crosshair)) {
            return false;
          }
        }
        return true;
      })
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
