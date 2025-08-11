// ==UserScript==
// @name         AutoHeadlockProMax v19.0 - Magnetic Beam Lock
// @version      19.0
// @description  Kéo là tâm lia mượt theo đầu cả chùm, 100% head lock, multi-bullet sync, predict + stick aim
// @match        *://*/*
// @run-at       document-start
// ==/UserScript==

(() => {
  'use strict';

  const CONFIG = {
    headYOffsetPx: -4,
    tickIntervalMs: 1,           // tick cực nhanh để lia mượt
    smoothingFollow: 1,       // độ mượt khi lia
    smoothingSnap: 1,         // gần head thì bám nhanh hơn
    fireOnLock: true,
    fullMagDump: true,
    fullMagCountOverride: 60,    // hỗ trợ băng dài
    aimThresholdPx: 30,          // chuẩn hơn, lock chặt
    predictMs: 120,               // dự đoán chuyển động đầu
    bulletDropFactor: 0.002,
    multiBulletComp: true        // bù từng viên trong chùm
  };

  let STATE = {
    bursting: false,
    lastTarget: null
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

  function multiBulletAdjustment(aimPos, shotIndex) {
    if (!CONFIG.multiBulletComp) return aimPos;
    // Mỗi viên trong chùm sẽ bù 1 chút theo quán tính vuốt tay
    const offset = (shotIndex % 2 === 0 ? -0.5 : 0.5) * (shotIndex / 10);
    return { x: aimPos.x + offset, y: aimPos.y };
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

    // Nếu đang giữ bắn → lia mượt
    const smoothing = STATE.bursting ? CONFIG.smoothingFollow : CONFIG.smoothingSnap;

    let newX = current.x + (aimTarget.x - current.x) * smoothing;
    let newY = current.y + (aimTarget.y - current.y) * smoothing;

    // Nếu quá lệch → snap luôn
    if (Math.hypot(newX - aimTarget.x, newY - aimTarget.y) > CONFIG.aimThresholdPx) {
      newX = aimTarget.x;
      newY = aimTarget.y;
    }

    const newAim = { x: newX, y: newY };
    setCrosshair(newAim);

    // Khi gần head → bắn theo từng viên
    if (CONFIG.fireOnLock && Math.hypot(newAim.x - aimTarget.x, newAim.y - aimTarget.y) <= CONFIG.aimThresholdPx) {
      if (!STATE.bursting) {
        STATE.bursting = true;
        for (let i = 0; i < CONFIG.fullMagCountOverride; i++) {
          const adjustedAim = multiBulletAdjustment(aimTarget, i);
          setCrosshair(adjustedAim);
          fireOnce();
        }
        STATE.bursting = false;
      }
    }
  }

  function tick() {
    const enemies = getEnemies();
    if (enemies.length === 0) {
      STATE.lastTarget = null;
      return;
    }
    const target = STATE.lastTarget && getEnemies().includes(STATE.lastTarget)
      ? STATE.lastTarget
      : chooseTarget(enemies);
    if (!target) return;
    STATE.lastTarget = target;
    aimAtHead(target);
  }

  setInterval(tick, CONFIG.tickIntervalMs);
  window.FullHeadLock = { CONFIG, STATE };
})();
