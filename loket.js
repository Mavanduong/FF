// ==UserScript==
// @name         AutoHeadlockProMax v18.5 - DeathTouch Ultra+
// @version      18.5
// @description  100% head lock, AI predict, no recoil/spread, kill fastest possible
// @match        *://*/*
// @run-at       document-start
// ==/UserScript==

(() => {
  'use strict';

  const CONFIG = {
    headYOffsetPx: -4,
    tickIntervalMs: 1.5,          // nhanh hơn nữa
    smoothingBase: 0.92,          // base mượt
    smoothingClose: 0.99,         // gần thì mượt cực cao
    fireOnLock: true,
    fullMagDump: true,
    fullMagCountOverride: 50,     // xả nhiều hơn
    aimThresholdPx: 25,           // lock rộng hơn để không bỏ lỡ
    extraPenetrationShots: 4,     // xuyên mạnh hơn
    predictMs: 80,                // dự đoán vị trí đầu 80ms
    bulletDropFactor: 0.002       // bù rơi đạn theo khoảng cách
  };

  let STATE = {
    bursting: false,
  };

  function getPlayer() {
    return window.player || { x:0,y:0,z:0, vx:0, vy:0, vz:0, weapon:{name:'default'} };
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
      .map(e => {
        const head = getHead(e);
        const dist = distance(player, head);
        const dangerScore = (e.isShooting ? 50 : 0) + (e.hp < 40 ? 20 : 0) + (200 - dist);
        return { enemy: e, score: dangerScore };
      })
      .sort((a,b) => b.score - a.score)[0]?.enemy || null;
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
          game.player.weapon.lastShotTime = 0;
          game.player.weapon.fireCooldown = 0;
        }
        game.fire();
      } catch(e){}
    }
  }

  function dumpMag(count) {
    if (STATE.bursting) return;
    STATE.bursting = true;
    try {
      for (let i = 0; i < count; i++) fireOnce();
    } catch(e){}
    STATE.bursting = false;
  }

  function shootPenetrationShots() {
    for(let i=0; i < CONFIG.extraPenetrationShots; i++) fireOnce();
  }

  function predictHeadPosition(head, enemy) {
    if (!enemy.vx && !enemy.vy) return head;
    return {
      x: head.x + (enemy.vx || 0) * (CONFIG.predictMs / 1000),
      y: head.y + (enemy.vy || 0) * (CONFIG.predictMs / 1000),
      z: head.z + (enemy.vz || 0) * (CONFIG.predictMs / 1000)
    };
  }

  function applyBulletDrop(aimPos, dist) {
    return { x: aimPos.x, y: aimPos.y - dist * CONFIG.bulletDropFactor };
  }

  function aimAtHead(target) {
    const headRaw = getHead(target);
    if (!headRaw) return;

    const player = getPlayer();
    const dist = distance(player, headRaw);

    let predicted = predictHeadPosition(headRaw, target);
    predicted = applyBulletDrop(predicted, dist);

    const aimTarget = { x: predicted.x, y: predicted.y + CONFIG.headYOffsetPx };
    const current = (window.game && game.crosshair) ? { x: game.crosshair.x, y: game.crosshair.y } : { x:0, y:0 };

    const smoothing = dist < 15 ? CONFIG.smoothingClose : CONFIG.smoothingBase;

    let newX = current.x + (aimTarget.x - current.x) * smoothing;
    let newY = current.y + (aimTarget.y - current.y) * smoothing;

    // Nếu lệch thì snap luôn
    if (Math.hypot(newX - aimTarget.x, newY - aimTarget.y) > CONFIG.aimThresholdPx) {
      newX = aimTarget.x;
      newY = aimTarget.y;
    }

    const newAim = { x: newX, y: newY };
    setCrosshair(newAim);

    const distToTarget = Math.hypot(newAim.x - aimTarget.x, newAim.y - aimTarget.y);
    if (CONFIG.fireOnLock && distToTarget <= CONFIG.aimThresholdPx && !STATE.bursting) {
      shootPenetrationShots();
      dumpMag(CONFIG.fullMagCountOverride);
    }
  }

  function tick() {
    const enemies = getEnemies();
    if (enemies.length === 0) return;
    const target = chooseTarget(enemies);
    if (!target) return;
    aimAtHead(target);
  }

  setInterval(tick, CONFIG.tickIntervalMs);
  window.FullHeadLock = { CONFIG, STATE };
})();
