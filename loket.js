// ==UserScript==
// @name         AutoHeadlockProMax v14.4c-UltraCalib-SuperSnap
// @version      14.4c-UltraCalib-SuperSnap
// @description  Cực mạnh: vuốt lệch 3-5m vẫn auto kéo về đầu cực chuẩn, clamp 0.3px siêu mượt, multi-bullet chuẩn từng viên, fire tự động, tick 1ms
// @match        *://*/*
// @run-at       document-start
// ==/UserScript==

(() => {
  const CONFIG = {
    mode: 'ultracalib-supersnap',
    closeRangeMeters: 99999,
    preFireRange: 80,
    maxEngageDistance: 999999,
    instantSnapDivisor: 0.000001,
    overtrackLeadFactor: 15.0,
    preFireLeadMs: 180,
    weaponProfiles: {
      default: { projectileSpeed: 99999999, multiBulletCount: 10, burstCompFactor: 1.5 },
      MP40:    { projectileSpeed: 99999999, multiBulletCount: 12, burstCompFactor: 1.7 },
      M1014:   { projectileSpeed: 99999999, multiBulletCount: 8,  burstCompFactor: 1.8 },
      Vector:  { projectileSpeed: 99999999, multiBulletCount: 12, burstCompFactor: 1.6 }
    },
    instantFireIfHeadLocked: true,
    crosshairNearThresholdPx: 0.8,
    tickIntervalMs: 1,
    clampStepPx: 0.3,
    maxLeadMs: 150,
    calibCorrectionFactor: 0.5 // tăng cực mạnh để auto chỉnh vuốt lệch lớn
  };

  let STATE = {
    lastShotAt: 0,
    hits: 0,
    misses: 0,
    calibrationOffset: { x: 0, y: 0 }
  };

  function now() { return Date.now(); }
  function getPlayer() { return window.player || { x: 0, y: 0, z: 0, hp: 100, weapon: { name: 'default' } }; }
  function getEnemies() { return (window.game && game.enemies) ? game.enemies : []; }
  function distanceBetween(a, b) {
    const dx = (a.x || 0) - (b.x || 0), dy = (a.y || 0) - (b.y || 0), dz = (a.z || 0) - (b.z || 0);
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

  // Clamp di chuyển crosshair cực nhỏ để tránh overshoot
  function clampAimMove(current, target, maxStepPx = CONFIG.clampStepPx) {
    const dx = target.x - current.x;
    const dy = target.y - current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= maxStepPx) return { x: target.x, y: target.y };
    const ratio = maxStepPx / dist;
    return { x: current.x + dx * ratio, y: current.y + dy * ratio };
  }

  // Tính khoảng cách 2D
  function dist2D(a, b) {
    if (!a || !b) return Infinity;
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Dự đoán xoay đầu cực chính xác
  function predictHeadTurn(enemy, msAhead = CONFIG.maxLeadMs) {
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

    const offsetRadius = 0.22;
    const offsetX = Math.cos(futureYaw) * offsetRadius;
    const offsetY = Math.sin(futureYaw) * offsetRadius;
    const offsetZ = Math.sin(futurePitch) * offsetRadius;

    return { x: head.x + offsetX, y: head.y + offsetY, z: (head.z || 0) + offsetZ };
  }

  // Dự đoán vị trí tuyến tính kết hợp dự đoán xoay đầu
  function predictPosition(enemy, msAhead = 0) {
    if (!enemy) return null;
    if (typeof game !== 'undefined' && typeof game.predict === 'function') {
      try { return game.predict(enemy, getHeadPos(enemy), msAhead / 1000); } catch (e) { }
    }
    const head = getHeadPos(enemy);
    const vel = enemy.velocity || { x: 0, y: 0, z: 0 };
    return { x: head.x + vel.x * (msAhead / 1000), y: head.y + vel.y * (msAhead / 1000), z: (head.z || 0) + (vel.z || 0) * (msAhead / 1000) };
  }

  function predictUltra(enemy, msAhead = CONFIG.maxLeadMs) {
    const headTurnPos = predictHeadTurn(enemy, msAhead);
    const linearPos = predictPosition(enemy, msAhead);
    if (!headTurnPos) return linearPos;
    if (!linearPos) return headTurnPos;

    return {
      x: headTurnPos.x * 0.8 + linearPos.x * 0.2,
      y: headTurnPos.y * 0.8 + linearPos.y * 0.2,
      z: headTurnPos.z * 0.8 + linearPos.z * 0.2
    };
  }

  // Bù calibration cực mạnh, tự sửa vuốt lệch lớn 3-5m
  function strongAutoCalibrate(currentPos, targetPos) {
    const errorX = targetPos.x - currentPos.x;
    const errorY = targetPos.y - currentPos.y;
    const factor = CONFIG.calibCorrectionFactor; // 0.5 mặc định
    return { x: errorX * factor, y: errorY * factor };
  }

  // Áp dụng multi-bullet chuẩn từng viên với bù calibration offset
  function applyWeaponCompensation(enemy) {
    const head = getHeadPos(enemy);
    if (!head) return null;
    const player = getPlayer();
    const wname = (player.weapon && player.weapon.name) ? player.weapon.name : 'default';
    const prof = CONFIG.weaponProfiles[wname] || CONFIG.weaponProfiles.default;

    if (prof.projectileSpeed && prof.projectileSpeed < 1e9) {
      const dist = distanceBetween(player, head);
      const travelSec = dist / prof.projectileSpeed;
      let leadMs = travelSec * 1000 * CONFIG.overtrackLeadFactor;
      if (leadMs > CONFIG.maxLeadMs) leadMs = CONFIG.maxLeadMs;

      const bullets = prof.multiBulletCount || 1;
      if (bullets <= 1) return predictUltra(enemy, leadMs);

      const positions = [];
      for (let i = 0; i < bullets; i++) {
        const msOffset = leadMs + i * 7;
        let basePos = predictUltra(enemy, msOffset);
        positions.push({
          x: basePos.x + STATE.calibrationOffset.x,
          y: basePos.y + STATE.calibrationOffset.y,
          z: basePos.z
        });
      }
      const avgPos = positions.reduce((acc, p) => ({
        x: acc.x + p.x,
        y: acc.y + p.y,
        z: acc.z + p.z
      }), { x: 0, y: 0, z: 0 });
      return {
        x: avgPos.x / bullets,
        y: avgPos.y / bullets,
        z: avgPos.z / bullets
      };
    }
    return predictUltra(enemy, CONFIG.maxLeadMs);
  }

  // Khoảng cách crosshair đến đầu
  function crosshairIsNearHead(enemy, thresholdPx = CONFIG.crosshairNearThresholdPx) {
    const head = getHeadPos(enemy);
    const ch = crosshairPos();
    if (!head) return false;
    const dx = ch.x - head.x, dy = ch.y - head.y;
    return Math.sqrt(dx * dx + dy * dy) <= thresholdPx;
  }

  // Vuốt với clamp và bù calibration mạnh, clamp step thay đổi theo khoảng cách lệch (3-5m vẫn vuốt cực nhanh)
  function aimAtHead(enemy) {
    const current = crosshairPos();
    const head = getHeadPos(enemy);
    if (!head) return current;

    const predictedHead = {
      x: head.x + STATE.calibrationOffset.x,
      y: head.y + STATE.calibrationOffset.y,
      z: head.z || 0
    };

    const dist = Math.sqrt((current.x - predictedHead.x) ** 2 + (current.y - predictedHead.y) ** 2);

    // tăng clampStepPx khi lệch lớn để vuốt nhanh về tâm
    let clampStep = CONFIG.clampStepPx;
    if (dist > 300) clampStep = 150;
    else if (dist > 100) clampStep = 70;
    else if (dist > 50) clampStep = 30;

    // bù calibration mạnh
    const calibrationAdjust = strongAutoCalibrate(current, predictedHead);
    STATE.calibrationOffset.x += calibrationAdjust.x;
    STATE.calibrationOffset.y += calibrationAdjust.y;

    // vị trí mục tiêu bù calibration
    const adjustedTarget = {
      x: predictedHead.x + STATE.calibrationOffset.x,
      y: predictedHead.y + STATE.calibrationOffset.y
    };

    return clampAimMove(current, adjustedTarget, clampStep);
  }

  function scoreTarget(enemy) {
    const player = getPlayer();
    const head = getHeadPos(enemy);
    if (!head) return { score: -Infinity, dist: Infinity };
    const dist
