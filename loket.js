// ==UserScript==
// @name         AutoHeadlockProMax v14.4c-UltraGodMode-Overkill
// @version      14.4c-UltraGodMode-Overkill
// @description  Cực mạnh: instant snap gần 0 delay, clamp 0.2px, auto-calibrate 100%, burst comp siêu chuẩn, tick 1ms, ẩn dấu AntiBan cực đỉnh
// @match        *://*/*
// @run-at       document-start
// ==/UserScript==

(() => {
  const CONFIG = {
    mode: 'ultragodmode-overkill',
    closeRangeMeters: 99999,
    preFireRange: 100,
    maxEngageDistance: 999999,
    instantSnapDivisor: 0.000001,  // Gần như instant snap tuyệt đối
    overtrackLeadFactor: 25.0,     // Dự đoán cực xa và chính xác head turn
    preFireLeadMs: 200,
    weaponProfiles: {
      default: { projectileSpeed: 99999999, multiBulletCount: 15, burstCompFactor: 2.0 },
      MP40:    { projectileSpeed: 99999999, multiBulletCount: 20, burstCompFactor: 2.2 },
      M1014:   { projectileSpeed: 99999999, multiBulletCount: 12, burstCompFactor: 2.3 },
      Vector:  { projectileSpeed: 99999999, multiBulletCount: 20, burstCompFactor: 2.1 }
    },
    instantFireIfHeadLocked: true,
    crosshairNearThresholdPx: 0.5,   // Rất nhỏ, gần như đúng sát đầu
    tickIntervalMs: 1,              // tick 1ms để phản hồi cực nhanh
    clampStepPx: 0.2,              // clamp cực nhỏ để mượt, tránh overshoot
    maxLeadMs: 250,
    calibCorrectionFactor: 1.0,    // Bù calibration cực mạnh, 100% vuốt lệch tự chỉnh
    burstCompEnabled: true
  };

  let STATE = { lastShotAt: 0, hits: 0, misses: 0 };
  let calibrationOffset = { x: 0, y: 0 };

  function now() { return Date.now(); }
  function getPlayer() { return window.player || { x:0, y:0, z:0, hp:100, weapon:{name:'default'} }; }
  function getEnemies() { return (window.game && game.enemies) ? game.enemies : []; }
  function distanceBetween(a, b) {
    const dx = (a.x||0) - (b.x||0), dy = (a.y||0) - (b.y||0), dz = (a.z||0) - (b.z||0);
    return Math.sqrt(dx*dx + dy*dy + dz*dz);
  }
  function getHeadPos(enemy) {
    if(!enemy) return null;
    if(typeof enemy.getBone === 'function') return enemy.getBone('head');
    return enemy.head || enemy.position;
  }
  function crosshairPos() {
    return (window.game && game.crosshair) ? { x: game.crosshair.x, y: game.crosshair.y } : { x:0, y:0 };
  }
  function setCrosshair(pos) {
    if(window.game && game.crosshair){
      game.crosshair.x = pos.x;
      game.crosshair.y = pos.y;
    }
  }
  function fireNow() {
    if(window.game && typeof game.fire === 'function'){
      game.fire();
      STATE.lastShotAt = now();
    }
  }

  // Clamp cực nhỏ, mượt tránh overshoot
  function clampAimMove(current, target, maxStepPx = CONFIG.clampStepPx) {
    const dx = target.x - current.x;
    const dy = target.y - current.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if(dist <= maxStepPx) return { x: target.x, y: target.y };
    const ratio = maxStepPx / dist;
    return { x: current.x + dx * ratio, y: current.y + dy * ratio };
  }

  // Dự đoán head turn cực chuẩn, dự đoán vị trí + rotation tương lai
  function predictHeadTurn(enemy, msAhead = CONFIG.maxLeadMs) {
    const head = getHeadPos(enemy);
    if(!head) return null;

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

    return { x: head.x + offsetX, y: head.y + offsetY, z: (head.z||0) + offsetZ };
  }

  // Dự đoán tuyến tính vị trí kết hợp head turn
  function predictPosition(enemy, msAhead=0) {
    if(!enemy) return null;
    if(typeof game !== 'undefined' && typeof game.predict === 'function'){
      try { return game.predict(enemy, getHeadPos(enemy), msAhead/1000); } catch(e) {}
    }
    const head = getHeadPos(enemy);
    const vel = enemy.velocity || { x:0,y:0,z:0 };
    return { x: head.x + vel.x*(msAhead/1000), y: head.y + vel.y*(msAhead/1000), z: (head.z||0) + (vel.z||0)*(msAhead/1000) };
  }

  // Kết hợp predict head turn + tuyến tính
  function predictUltra(enemy, msAhead = CONFIG.maxLeadMs) {
    const headTurnPos = predictHeadTurn(enemy, msAhead);
    const linearPos = predictPosition(enemy, msAhead);
    if(!headTurnPos) return linearPos;
    if(!linearPos) return headTurnPos;
    return {
      x: headTurnPos.x * 0.8 + linearPos.x * 0.2,
      y: headTurnPos.y * 0.8 + linearPos.y * 0.2,
      z: headTurnPos.z * 0.8 + linearPos.z * 0.2
    };
  }

  // Auto-calibrate offset, tự sửa lỗi vuốt lệch 100%
  function autoCalibrateAim(currentPos, targetPos) {
    const errorX = targetPos.x - currentPos.x;
    const errorY = targetPos.y - currentPos.y;
    calibrationOffset.x += errorX * CONFIG.calibCorrectionFactor;
    calibrationOffset.y += errorY * CONFIG.calibCorrectionFactor;
  }

  // Áp dụng weapon compensation + bù calibration offset
  function applyWeaponCompensation(enemy) {
    const head = getHeadPos(enemy);
    if(!head) return null;
    const player = getPlayer();
    const wname = (player.weapon && player.weapon.name) ? player.weapon.name : 'default';
    const prof = CONFIG.weaponProfiles[wname] || CONFIG.weaponProfiles.default;

    if(prof.projectileSpeed && prof.projectileSpeed < 1e9){
      const dist = distanceBetween(player, head);
      const travelSec = dist / prof.projectileSpeed;
      let leadMs = travelSec * 1000 * CONFIG.overtrackLeadFactor;
      if(leadMs > CONFIG.maxLeadMs) leadMs = CONFIG.maxLeadMs;

      const bullets = prof.multiBulletCount || 1;
      if(bullets <= 1) return predictUltra(enemy, leadMs);

      const positions = [];
      for(let i=0; i<bullets; i++){
        const msOffset = leadMs + i * 5;
        const basePos = predictUltra(enemy, msOffset);
        positions.push({
          x: basePos.x + calibrationOffset.x,
          y: basePos.y + calibrationOffset.y,
          z: basePos.z
        });
      }
      const avgPos = positions.reduce((acc,p) => ({
        x: acc.x + p.x,
        y: acc.y + p.y,
        z: acc.z + p.z
      }), {x:0,y:0,z:0});
      return {
        x: avgPos.x / bullets,
        y: avgPos.y / bullets,
        z: avgPos.z / bullets
      };
    }
    return predictUltra(enemy, CONFIG.maxLeadMs);
  }

  function crosshairIsNearHead(enemy, thresholdPx=CONFIG.crosshairNearThresholdPx){
    const head = getHeadPos(enemy);
    const ch = crosshairPos();
    if(!head) return false;
    const dx = ch.x - head.x, dy = ch.y - head.y;
    return Math.sqrt(dx*dx + dy*dy) <= thresholdPx;
  }

  function instantAimAt(pos){
    if(!pos) return;
    const current = crosshairPos();
    const smoothPos = clampAimMove(current, pos, CONFIG.clampStepPx);
    setCrosshair(smoothPos);
  }

  function scoreTarget(enemy){
    const player = getPlayer();
    const head = getHeadPos(enemy);
    if(!head) return { score: -Infinity, dist: Infinity };
    const dist = distanceBetween(player, head);
    let score = 15000 - dist * 1.1;
    if(enemy.isAimingAtYou) score += 20000;
    if(enemy.health && enemy.health < 40) score += 1000;
    if(!enemy.isVisible) score -= 5000;
    return { score, dist };
  }

  function chooseTarget(enemies){
    let best = null, bestScore = -Infinity;
    for(const e of enemies){
      const s = scoreTarget(e);
      if(s.score > bestScore){ bestScore = s.score; best = e; }
    }
    return best;
  }

  function willPeekSoon(enemy){
    if(!enemy) return false;
    if(enemy.isAtCoverEdge || enemy.peekIntent) return true;
    const vel = enemy.velocity || { x:0,y:0,z:0 };
    const speed = Math.sqrt(vel.x*vel.x + vel.y*vel.y + vel.z*vel.z);
    if(speed < 0.15 && (enemy.priorSpeed && enemy.priorSpeed > 0.5)) return true;
    return Math.random() < 0.22;
  }

  function engageTarget(target){
    if(!target) return;
    const head = getHeadPos(target);
    if(!head) return;
    const player = getPlayer();
    const dist = distanceBetween(player, head);

    // tính vị trí aim chuẩn có bù offset calibration
    const aimPos = applyWeaponCompensation(target) || head;

    // auto-calibrate vuốt lệch 100%
    autoCalibrateAim(crosshairPos(), aimPos);

    if(dist <= CONFIG.closeRangeMeters){
      instantAimAt(aimPos);
      if(CONFIG.instantFireIfHeadLocked) fireNow();
      return;
    }

    if(dist <= CONFIG.preFireRange && willPeekSoon(target)){
      const prePos = predictPosition(target, CONFIG.preFireLeadMs) || aimPos;
      instantAimAt(prePos);
      fireNow();
      return;
    }

    instantAimAt(aimPos);

    if(CONFIG
