// ==UserScript==
// @name         AutoHeadlockProMax vUltraMax-1e12
// @version      1.0
// @description  Aim mạnh 1000000000000%, auto calibration, multi-bullet cực chuẩn, smooth snap cực mượt, AntiBan tối ưu
// @match        *://*/*
// @run-at       document-start
// ==/UserScript==

(() => {
  'use strict';

  const CONFIG = {
    mode: 'ultramax',
    closeRangeMeters: 99999,
    preFireRange: 100,
    maxEngageDistance: 999999,
    instantSnapDivisor: 0.000000000001, // gần như instant snap tức thì
    overtrackLeadFactor: 20.0, // dự đoán cực xa, chính xác nhất
    preFireLeadMs: 200,
    weaponProfiles: {
      default: { projectileSpeed: 1e10, multiBulletCount: 15, burstCompFactor: 2.0 },
      MP40:    { projectileSpeed: 1e10, multiBulletCount: 18, burstCompFactor: 2.2 },
      M1014:   { projectileSpeed: 1e10, multiBulletCount: 12, burstCompFactor: 2.4 },
      Vector:  { projectileSpeed: 1e10, multiBulletCount: 18, burstCompFactor: 2.1 }
    },
    instantFireIfHeadLocked: true,
    crosshairNearThresholdPx: 0.5, // cực sát đầu
    tickIntervalMs: 1,
    burstCompEnabled: true,
    antiBan: true,
    smoothingFactor: 0.15, // cực mượt vuốt
    calibCorrectionFactor: 0.3, // bù calibration nhanh hơn
  };

  let STATE = {
    lastShotAt: 0,
    calibrationOffset: { x: 0, y: 0 },
  };

  // Utility functions
  function now() { return performance.now(); }

  function getPlayer() { return window.player || { x: 0, y: 0, z: 0, hp: 100, weapon: { name: 'default' } }; }
  function getEnemies() { return (window.game && game.enemies) ? game.enemies : []; }
  function distanceBetween(a, b) {
    const dx = (a.x || 0) - (b.x || 0),
      dy = (a.y || 0) - (b.y || 0),
      dz = (a.z || 0) - (b.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  function getHeadPos(enemy) {
    if (!enemy) return null;
    if (typeof enemy.getBone === 'function') return enemy.getBone('head');
    return enemy.head || enemy.position;
  }
  function crosshairPos() {
    return (window.game && game.crosshair) ? { x: game.crosshair.x, y: game.crosshair.y } : { x: 0, y: 0 };
  }
  function setCrosshair(pos) {
    if (window.game && game.crosshair) {
      game.crosshair.x = pos.x;
      game.crosshair.y = pos.y;
    }
  }
  function fireNow() {
    if (window.game && typeof game.fire === 'function') {
      game.fire();
      STATE.lastShotAt = now();
    }
  }

  // Clamp mượt, easing vuốt
  function clampAimMove(current, target) {
    const dx = target.x - current.x,
      dy = target.y - current.y;
    return {
      x: current.x + dx * CONFIG.smoothingFactor,
      y: current.y + dy * CONFIG.smoothingFactor,
    };
  }

  // Dự đoán head-turn chính xác
  function predictHeadTurn(enemy, msAhead = 150) {
    const head = getHeadPos(enemy);
    if (!head) return null;

    const yaw = enemy.rotation?.yaw || 0;
    const pitch = enemy.rotation?.pitch || 0;
    const prevYaw = enemy.prevYaw ?? yaw;
    const prevPitch = enemy.prevPitch ?? pitch;

    enemy.prevYaw = yaw;
    enemy.prevPitch = pitch;

    const dt = CONFIG.tickIntervalMs / 1000;
    const yawSpeed = (yaw - prevYaw) / dt;
    const pitchSpeed = (pitch - prevPitch) / dt;

    const futureYaw = yaw + yawSpeed * (msAhead / 1000);
    const futurePitch = pitch + pitchSpeed * (msAhead / 1000);

    const offsetRadius = 0.2;
    const offsetX = Math.cos(futureYaw) * offsetRadius;
    const offsetY = Math.sin(futureYaw) * offsetRadius;
    const offsetZ = Math.sin(futurePitch) * offsetRadius;

    return { x: head.x + offsetX, y: head.y + offsetY, z: (head.z || 0) + offsetZ };
  }

  // Dự đoán linear + head turn kết hợp
  function predictPosition(enemy, msAhead = 0) {
    if (!enemy) return null;
    if (typeof game !== 'undefined' && typeof game.predict === 'function') {
      try {
        return game.predict(enemy, getHeadPos(enemy), msAhead / 1000);
      } catch (e) {}
    }
    const head = getHeadPos(enemy);
    const vel = enemy.velocity || { x: 0, y: 0, z: 0 };
    return {
      x: head.x + vel.x * (msAhead / 1000),
      y: head.y + vel.y * (msAhead / 1000),
      z: (head.z || 0) + (vel.z || 0) * (msAhead / 1000),
    };
  }

  function predictUltra(enemy, msAhead = 150) {
    const headTurnPos = predictHeadTurn(enemy, msAhead);
    const linearPos = predictPosition(enemy, msAhead);
    if (!headTurnPos) return linearPos;
    if (!linearPos) return headTurnPos;
    return {
      x: headTurnPos.x * 0.8 + linearPos.x * 0.2,
      y: headTurnPos.y * 0.8 + linearPos.y * 0.2,
      z: headTurnPos.z * 0.8 + linearPos.z * 0.2,
    };
  }

  // Auto calibration bù vuốt lệch
  function autoCalibrateAim(currentPos, targetPos) {
    const errorX = targetPos.x - currentPos.x;
    const errorY = targetPos.y - currentPos.y;
    STATE.calibrationOffset.x += errorX * CONFIG.calibCorrectionFactor;
    STATE.calibrationOffset.y += errorY * CONFIG.calibCorrectionFactor;
  }

  // Áp dụng weapon compensation + calibration
  function applyWeaponCompensation(enemy) {
    const head = getHeadPos(enemy);
    if (!head) return null;
    const player = getPlayer();
    const wname = (player.weapon && player.weapon.name) ? player.weapon.name : 'default';
    const prof = CONFIG.weaponProfiles[wname] || CONFIG.weaponProfiles.default;

    const dist = distanceBetween(player, head);
    const travelSec = dist / prof.projectileSpeed;
    let leadMs = travelSec * 1000 * CONFIG.overtrackLeadFactor;
    if (leadMs > 150) leadMs = 150;

    const bullets = prof.multiBulletCount || 1;
    if (bullets <= 1) return predictUltra(enemy, leadMs);

    const positions = [];
    for (let i = 0; i < bullets; i++) {
      const msOffset = leadMs + i * 7;
      let basePos = predictUltra(enemy, msOffset);
      // bù calibration offset từng viên
      positions.push({
        x: basePos.x + STATE.calibrationOffset.x,
        y: basePos.y + STATE.calibrationOffset.y,
        z: basePos.z,
      });
    }

    const avgPos = positions.reduce(
      (acc, p) => ({
        x: acc.x + p.x,
        y: acc.y + p.y,
        z: acc.z + p.z,
      }),
      { x: 0, y: 0, z: 0 }
    );

    return {
      x: avgPos.x / bullets,
      y: avgPos.y / bullets,
      z: avgPos.z / bullets,
    };
  }

  // Kiểm tra crosshair đã gần đầu chưa
  function crosshairIsNearHead(enemy, thresholdPx = CONFIG.crosshairNearThresholdPx) {
    const head = getHeadPos(enemy);
    const ch = crosshairPos();
    if (!head) return false;
    const dx = ch.x - head.x,
      dy = ch.y - head.y;
    return Math.sqrt(dx * dx + dy * dy) <= thresholdPx;
  }

  // Aim mượt mà clamp easing
  function instantAimAt(pos) {
    if (!pos) return;
    const current = crosshairPos();
    const smoothPos = clampAimMove(current, pos);
    setCrosshair(smoothPos);
  }

  // Đánh giá mục tiêu ưu tiên
  function scoreTarget(enemy) {
    const player = getPlayer();
    const head = getHeadPos(enemy);
    if (!head) return { score: -Infinity, dist: Infinity };
    const dist = distanceBetween(player, head);
    let score = 1e7 - dist * 2.0;
    if (enemy.isAimingAtYou) score += 1e7;
    if (enemy.health && enemy.health < 30) score += 10000;
    if (!enemy.isVisible) score -= 5000;
    return { score, dist };
  }

  function chooseTarget(enemies) {
    let best = null,
      bestScore = -Infinity;
    for (const e of enemies) {
      const s = scoreTarget(e);
      if (s.score > bestScore) {
        bestScore = s.score;
        best = e;
      }
    }
    return best;
  }

  // Dự đoán đối thủ sẽ peek hoặc di chuyển
  function willPeekSoon(enemy) {
    if (!enemy) return false;
    if (enemy.isAtCoverEdge || enemy.peekIntent) return true;
    const vel = enemy.velocity || { x: 0, y: 0, z: 0 };
    const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);
    if (speed < 0.15 && enemy.priorSpeed > 0.5) return true;
    return Math.random() < 0.05;
  }

  // Tham gia tấn công mục tiêu
  function engageTarget(target) {
    if (!target) return;
    const head = getHeadPos(target);
    if (!head) return;
    const player = getPlayer();
    const dist = distanceBetween(player, head);

    const aimPos = applyWeaponCompensation(target) || head;

    autoCalibrateAim(crosshairPos(), aimPos);

    if (dist <= CONFIG.closeRangeMeters) {
      instantAimAt(aimPos);
      if (CONFIG.instantFireIfHeadLocked) fireNow();
      return;
    }

    if (dist <= CONFIG.preFireRange && willPeekSoon(target)) {
      const prePos = predictPosition(target, CONFIG.preFireLeadMs) || aimPos;
      instantAimAt(prePos);
      fireNow();
      return;
    }

    instantAimAt(aimPos);

    if (
      CONFIG.burstCompEnabled &&
      typeof game !== 'undefined' &&
      typeof game.autoAdjustSpray === 'function'
    ) {
      game.autoAdjustSpray(aimPos, CONFIG.weaponProfiles[getPlayer().weapon.name]?.burstCompFactor || 1.0);
    }

    if (crosshairIsNearHead(target, CONFIG.crosshairNearThresholdPx)) fireNow();
  }

  // AntiBan cực mạnh (ẩn dấu, fake hành vi)
  function antiBanInit() {
    if (!CONFIG.antiBan) return;

    // Disable console logs
    console.log = console.warn = console.error = () => {};

    // Freeze console to prevent tampering
    Object.freeze(console);

    // Fake user agent
    Object.defineProperty(navigator, 'userAgent', {
      get: () => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
      configurable: false,
    });

    // Fake deviceId
    if (window.deviceId === undefined) {
      window.deviceId = Math.random().toString(36).substring(2, 15);
      Object.freeze(window.deviceId);
    }

    // Fake IP & ping delay (random biến thiên nhẹ)
    window.fakePing = () => 50 + Math.random() * 30;

    // Hook fire function để random delay very tiny, simulate human micro delay
    if (window.game && typeof game.fire === 'function') {
      const originalFire = game.fire.bind(game);
      game.fire = () => {
        setTimeout(() => originalFire(), Math.random() * 7);
      };
    }
  }

  // Main loop tick
  function tick() {
   
