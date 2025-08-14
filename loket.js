// ==UserScript==
// @name         AutoHeadlockProMax v15.0-NoEscape-GodMode-FullPower
// @version      15.0
// @description  FULL POWER: AI head turn prediction, magnetic stickiness, burst tracking, wall avoidance, auto-fire lead, beam smooth. NoEscape GodMode.
// @match        *://*/*
// @run-at       document-start
// ==/UserScript==

(() => {
  'use strict';

/* ============== CONFIG (MAX POWER + ADAPTIVE AI) ============== */
const CONFIG = Object.freeze({
    mode: 'NoEscape-GodMode-FullPower-AutoTuned',

    // Ranges – vô hạn nhưng AI điều chỉnh
    closeRangeMeters: Infinity,
    preFireRange: Infinity,
    maxEngageDistance: Infinity,

    // Aim smoothing / snap – instant, auto adjust theo ping
    instantSnapDivisor: 1e-10,
    minSnapDivisor: 1e-6, // an toàn khi ping cao

    // Prediction & lead – AI auto-tune
    baseHeadTurnPredictionMs: 9999999,
    headTurnPredictionMs: Infinity, // auto-tune dựa FPS & ping
    autoFireLeadMs: Infinity,
    preFireLeadMs: 0,

    // Stickiness – adaptive
    baseStickinessPx: 1e-9,
    stickinessPx: 1e-9,
    stickinessHoldMs: Infinity,
    stickinessFalloffFactor: 0.5, // giảm lực hút khi xa đầu

    // Wall / cover avoidance – max
    wallOffsetPx: 1e-7,

    // Magnetic beam – cực nhanh
    magneticBeamSmooth: 1e-20,

    // Burst / multi-bullet
    multiBulletWeapons: ['MP40', 'Vector', 'M1014', 'UMP', 'FAMAS'],
    recoilCompPerBullet: Infinity,
    burstCompEnabled: true,
    burstCompFactor: Infinity,

    // Weapon profiles – dynamic
   // Weapon profiles – full dynamic max mode
weaponProfiles: {
    default:   { recoilX: 0, recoilY: 0, spreadComp: 0, projectileSpeed: Infinity },

    // SMG
    MP40:      { recoilX: 0, recoilY: 0, spreadComp: 0, projectileSpeed: Infinity },
    Vector:    { recoilX: 0, recoilY: 0, spreadComp: 0, projectileSpeed: Infinity },
    UMP:       { recoilX: 0, recoilY: 0, spreadComp: 0, projectileSpeed: Infinity },
    MP5:       { recoilX: 0, recoilY: 0, spreadComp: 0, projectileSpeed: Infinity },
    P90:       { recoilX: 0, recoilY: 0, spreadComp: 0, projectileSpeed: Infinity },
    Thompson:  { recoilX: 0, recoilY: 0, spreadComp: 0, projectileSpeed: Infinity },

    // Shotgun
    M1014:     { recoilX: 0, recoilY: 0, spreadComp: 0, projectileSpeed: Infinity },
    SPAS12:    { recoilX: 0, recoilY: 0, spreadComp: 0, projectileSpeed: Infinity },
    M1887:     { recoilX: 0, recoilY: 0, spreadComp: 0, projectileSpeed: Infinity },

    // Assault Rifles
    FAMAS:     { recoilX: 0, recoilY: 0, spreadComp: 0, projectileSpeed: Infinity },
    AK47:      { recoilX: 0, recoilY: 0, spreadComp: 0, projectileSpeed: Infinity },
    M4A1:      { recoilX: 0, recoilY: 0, spreadComp: 0, projectileSpeed: Infinity },
    SCAR:      { recoilX: 0, recoilY: 0, spreadComp: 0, projectileSpeed: Infinity },
    AN94:      { recoilX: 0, recoilY: 0, spreadComp: 0, projectileSpeed: Infinity },
    XM8:       { recoilX: 0, recoilY: 0, spreadComp: 0, projectileSpeed: Infinity },
    GROZA:     { recoilX: 0, recoilY: 0, spreadComp: 0, projectileSpeed: Infinity },

    // Sniper Rifles
    AWM:       { recoilX: 0, recoilY: 0, spreadComp: 0, projectileSpeed: Infinity },
    KAR98K:    { recoilX: 0, recoilY: 0, spreadComp: 0, projectileSpeed: Infinity },
    M82B:      { recoilX: 0, recoilY: 0, spreadComp: 0, projectileSpeed: Infinity },
    Dragunov:  { recoilX: 0, recoilY: 0, spreadComp: 0, projectileSpeed: Infinity },

    // LMG
    M249:      { recoilX: 0, recoilY: 0, spreadComp: 0, projectileSpeed: Infinity },
    PKM:       { recoilX: 0, recoilY: 0, spreadComp: 0, projectileSpeed: Infinity },

    // Pistols
    DesertEagle: { recoilX: 0, recoilY: 0, spreadComp: 0, projectileSpeed: Infinity },
    USP:         { recoilX: 0, recoilY: 0, spreadComp: 0, projectileSpeed: Infinity },
    M500:        { recoilX: 0, recoilY: 0, spreadComp: 0, projectileSpeed: Infinity },

    // Melee / Special
    Crossbow:    { recoilX: 0, recoilY: 0, spreadComp: 0, projectileSpeed: Infinity },
    Pan:         { recoilX: 0, recoilY: 0, spreadComp: 0, projectileSpeed: Infinity },
    Katana:      { recoilX: 0, recoilY: 0, spreadComp: 0, projectileSpeed: Infinity }
},


    // AI auto mode switch
    instantFireIfHeadLocked: true,
    crosshairNearThresholdPx: Infinity,
    fireBurstCount: Infinity,
    dangerAimBonus: Infinity,
    humanSwipeThresholdPx: Infinity,
    lagCompensation: true,
    tickIntervalMs: 1e-9,
    microCorrectionEnabled: true,
    dynamicSmoothing: true, // mượt hơn khi mục tiêu đổi hướng

    // AI monitor
    monitorFPS: true,
    monitorPing: true,
    autoAdjustForLag: true
});




  /* ============== STATE & UTILITIES ============== */
  /* ============== STATE – Supreme Multi-Mode Engine ============== */
const STATE = {
    lastShotAt: 0,
    lastLockTime: 0,
    lastBeamPos: null,
    bulletIndex: 0,
    lastTargetId: null,
    lastTargetChange: 0,
    lastPing: 0,
    lastFPS: 0,
    frameCount: 0,
    tickCount: 0,
    playerCache: null,
    targetsSeen: new Map(), // id -> {lastSeen, pos}
    latencyHistory: [],
    fpsHistory: []
};

/* Time functions – multi mode */
const now = {
    highRes: () => typeof performance !== 'undefined' ? performance.now() : Date.now(),
    epochMs: () => Date.now(),
    epochSec: () => Math.floor(Date.now() / 1000),
    frameBased: () => STATE.frameCount
};

/* Smart getter – deep path, regex, multi fallback */
function safeGet(obj, path, def = undefined) {
    try {
        if (!obj || !path) return def;
        if (Array.isArray(path)) {
            for (let p of path) {
                const val = safeGet(obj, p);
                if (val !== undefined) return val;
            }
            return def;
        }
        if (path instanceof RegExp) {
            const key = Object.keys(obj || {}).find(k => path.test(k));
            return key ? obj[key] : def;
        }
        if (typeof path === 'string') {
            path = path.replace(/\[(\w+)\]/g, '.$1').split('.');
        }
        let res = obj;
        for (let key of path) {
            res = res?.[key];
            if (res === undefined) return def;
        }
        return res;
    } catch {
        return def;
    }
}

/* Distance – multiple metrics */
const distanceBetween = {
    euclidean3D: (a, b) => {
        if (!a || !b) return Infinity;
        return Math.hypot((a.x||0)-(b.x||0), (a.y||0)-(b.y||0), (a.z||0)-(b.z||0));
    },
    euclidean2D: (a, b) => {
        if (!a || !b) return Infinity;
        return Math.hypot((a.x||0)-(b.x||0), (a.y||0)-(b.y||0));
    },
    manhattan: (a, b) => {
        if (!a || !b) return Infinity;
        return Math.abs((a.x||0)-(b.x||0)) + Math.abs((a.y||0)-(b.y||0)) + Math.abs((a.z||0)-(b.z||0));
    },
    chebyshev: (a, b) => {
        if (!a || !b) return Infinity;
        return Math.max(Math.abs((a.x||0)-(b.x||0)), Math.abs((a.y||0)-(b.y||0)), Math.abs((a.z||0)-(b.z||0)));
    },
    weighted: (a, b, w={x:1,y:1,z:1}) => {
        if (!a || !b) return Infinity;
        return Math.hypot(
            ((a.x||0)-(b.x||0)) * w.x,
            ((a.y||0)-(b.y||0)) * w.y,
            ((a.z||0)-(b.z||0)) * w.z
        );
    }
};

/* Smart player fetch – multi-source + validation */
function getPlayer(forceRefresh = false) {
    try {
        if (!forceRefresh && STATE.playerCache) return STATE.playerCache;
        let p = null;
        if (window.game?.player) p = window.game.player;
        else if (window.player) p = window.player;
        else if (typeof getLocalPlayer === 'function') p = getLocalPlayer();
        else if (window.game?.entities) {
            p = Object.values(window.game.entities).find(e => e.isLocal);
        }
        // Basic validation
        if (p && p.health !== undefined && p.position) {
            STATE.playerCache = p;
            return p;
        }
        return {};
    } catch {
        return {};
    }
}

/* Auto runtime tracker */
function updateRuntimeStats() {
    STATE.frameCount++;
    STATE.tickCount++;
    if (typeof getPing === 'function') {
        const ping = getPing();
        STATE.lastPing = ping;
        STATE.latencyHistory.push(ping);
        if (STATE.latencyHistory.length > 100) STATE.latencyHistory.shift();
    }
    if (typeof getFPS === 'function') {
        const fps = getFPS();
        STATE.lastFPS = fps;
        STATE.fpsHistory.push(fps);
        if (STATE.fpsHistory.length > 100) STATE.fpsHistory.shift();
    }
}

  function adjustHeadLock(target) {
    if (!target) return;

    const player = getPlayer();
    if (!player?.pos) return;

    // ==== 1. Lấy vị trí xương ====
    let head = null, neck = null, chest = null;
    try {
        if (typeof target.getBonePos === 'function') {
            head  = target.getBonePos("head");
            neck  = target.getBonePos("neck");
            chest = target.getBonePos("spine") || target.getBonePos("chest");
        }
    } catch {}
    head  = head  || target.head  || target.position || null;
    neck  = neck  || head;
    chest = chest || head;
    if (!head) return;

    // ==== 2. Khoảng cách & tốc độ ====
    const dist = distanceBetween.euclidean3D(player.pos, target.pos);
    const vel = target.velocity || {x:0, y:0, z:0};
    const speed = Math.hypot(vel.x, vel.y, vel.z);

    // ==== 3. Adaptive vertical offset ====
    const baseHeadHeight = 0.25;
    let yOffset = baseHeadHeight;
    if (dist < 10)      yOffset *= 0.80 + (speed * 0.012);
    else if (dist < 25) yOffset *= 0.93 + (speed * 0.006);
    else                yOffset *= 1.00 + (speed * 0.002);
    yOffset = Math.min(Math.max(yOffset, baseHeadHeight * 0.72), baseHeadHeight * 1.08);

    // ==== 4. Chọn zone lock thông minh ====
    let targetPoint = head;
    if (target.isCrouching) targetPoint = neck;
    if (target.isJumping)   targetPoint = chest;
    if (target.health <= 20) targetPoint = chest; // kết liễu nhanh

    // ==== 5. Prediction nâng cao ====
    const shotsFired = STATE.bulletIndex || 0;
    const recoilComp = getWeaponRecoilFactor(player.weapon, shotsFired) || 0;
    const pingComp = Math.max((STATE.lastPing || 0) / 1000, 0);
    const bulletSpeed = safeGet(CONFIG.weaponProfiles, [player.weapon, 'projectileSpeed'], Infinity);
    const viewDir = target.viewDir || {x:0,y:0,z:0};

    // Dự đoán bằng velocity + viewDir
    const travelTime = dist / (bulletSpeed || 9999999);
    targetPoint.x += (vel.x + viewDir.x * speed * 0.4) * (travelTime + pingComp);
    targetPoint.y += (vel.y + viewDir.y * speed * 0.4) * (travelTime + pingComp);
    targetPoint.z += (vel.z + viewDir.z * speed * 0.4) * (travelTime + pingComp);

    // ==== 6. Bù giật dọc ====
    targetPoint.y -= recoilComp * 0.88;

    // ==== 7. Kiểm tra tầm nhìn & xuyên mục tiêu ====
    if (typeof hasLineOfSight === 'function' && !hasLineOfSight(player.pos, targetPoint)) return;
    if (typeof canPenetrate === 'function' && !canPenetrate(player.weapon, targetPoint)) return;

    // ==== 8. Điểm lock cuối ====
    const lockPoint = {
        x: targetPoint.x,
        y: targetPoint.y - yOffset,
        z: targetPoint.z
    };

    // ==== 9. Camera tilt & smoothing ====
    if (player.cameraTilt) {
        lockPoint.x += Math.sin(player.cameraTilt) * 0.01;
        lockPoint.y += Math.cos(player.cameraTilt) * 0.01;
    }
    if (speed > 5) {
        smoothAim(lockPoint, 0.1); // bám sát hơn khi chạy nhanh
    } else {
        aimAt(lockPoint);
    }
}

//chưa sửa
 function fireNow(mode = 'single', burstCount = 10, burstDelay = 50) {
  try {
    const nowTime = performance.now();

    // Cập nhật trạng thái chung
    STATE.lastShotAt = nowTime;
    STATE.bulletIndex = (STATE.bulletIndex || 0) + 1;

    const triggerFire = () => {
      if (window.game && typeof game.fire === 'function') {
        game.fire();
      } else if (typeof window.fire === 'function') {
        window.fire();
      }
      console.log(`Shot #${STATE.bulletIndex} at ${nowTime.toFixed(2)}ms`);
    };

    if (mode === 'single') {
      triggerFire();
    }
    else if (mode === 'burst') {
      for (let i = 0; i < burstCount; i++) {
        setTimeout(() => {
          triggerFire();
          STATE.bulletIndex++;
        }, i * burstDelay);
      }
    }
    else if (mode === 'auto') {
      let autoInterval = setInterval(() => {
        triggerFire();
        STATE.bulletIndex++;
        if (STATE.bulletIndex > 50) { // giới hạn an toàn
          clearInterval(autoInterval);
        }
      }, 100);
    }

  } catch (e) {
    console.error("fireNow error:", e);
  }
}


  /* ============== PREDICTION & COMPENSATION ============== */

  // Predict where enemy head will be after msAhead (combines velocity + view direction)
  function predictHeadTurn(enemy, msAhead = CONFIG.headTurnPredictionMs) {
  const head = getHeadPos(enemy);
  if (!head) return null;

  const vel = enemy.velocity || { x: 0, y: 0, z: 0 };
  const prevVel = enemy.prevVelocity || vel;
  const acc = {
    x: vel.x - prevVel.x,
    y: vel.y - prevVel.y,
    z: (vel.z || 0) - (prevVel.z || 0)
  };

  const view = enemy.viewDir || { x: 0, y: 0, z: 0 };
  const angularVel = enemy.angularVelocity || { x: 0, y: 0, z: 0 };

  // Adaptive weight: nếu kẻ địch đứng yên, tăng trọng số viewDir
  const speed = Math.sqrt(vel.x ** 2 + vel.y ** 2 + vel.z ** 2);
  const viewWeight = speed < 0.1 ? 1.5 : 1.0;
  const velWeight = speed < 0.1 ? 0.2 : 1.0;

  // Bù trễ mạng
  const latencySec = (CONFIG.networkPingMs || 50) / 1000;
  const t = (msAhead / 1000) + latencySec;

  // Dự đoán vị trí đầu
  return {
    x: head.x 
       + (vel.x * velWeight + view.x * 100 * viewWeight) * t 
       + 0.5 * acc.x * t * t
       + angularVel.x * t,
    y: head.y 
       + (vel.y * velWeight + view.y * 100 * viewWeight) * t 
       + 0.5 * acc.y * t * t
       + angularVel.y * t,
    z: (head.z || 0) 
       + ((vel.z || 0) * velWeight + (view.z || 0) * 1.1 * viewWeight) * t 
       + 0.5 * acc.z * t * t
       + angularVel.z * t
  };
}

  // Apply lag compensation based on network ping (if available)
 function applyLagComp(pos, enemy) {
  if (!CONFIG.lagCompensation || !pos || !enemy) return pos;

  try {
    // Lấy ping (ms)
    let ping = 0;
    if (game?.network?.ping) ping = game.network.ping;
    else if (game && game.network && game.network.ping) ping = game.network.ping;

    // Giới hạn ping để tránh bù quá đà
    ping = Math.min(Math.max(ping, 0), 500);

    // Vận tốc & gia tốc
    const vel = enemy.velocity || { x: 0, y: 0, z: 0 };
    const prevVel = enemy.prevVelocity || vel;
    const acc = {
      x: vel.x - prevVel.x,
      y: vel.y - prevVel.y,
      z: (vel.z || 0) - (prevVel.z || 0)
    };

    // Hướng nhìn (dùng khi vận tốc thấp nhưng kẻ địch xoay nhanh)
    const view = enemy.viewDir || { x: 0, y: 0, z: 0 };
    const angularVel = enemy.angularVelocity || { x: 0, y: 0, z: 0 };

    const t = ping / 1000; // giây

    // Bù trễ mạng + dự đoán mượt
    return {
      x: pos.x + vel.x * t + 0.5 * acc.x * t * t + view.x * 0.05 * t + angularVel.x * 0.02,
      y: pos.y + vel.y * t + 0.5 * acc.y * t * t + view.y * 0.05 * t + angularVel.y * 0.02,
      z: (pos.z || 0) + (vel.z || 0) * t + 0.5 * acc.z * t * t + (view.z || 0) * 0.02 * t
    };

  } catch (e) {
    return pos; // fallback
  }
}

//chua sua 2
  // Beam smoothing to make motion look human and avoid abrupt jumps
  function applyBeamMode(pos) {
    if (!pos) return pos;
    if (!STATE.lastBeamPos) {
      STATE.lastBeamPos = { ...pos };
      return pos;
    }
    const s = CONFIG.magneticBeamSmooth;
    const next = {
      x: STATE.lastBeamPos.x + (pos.x - STATE.lastBeamPos.x) * s,
      y: STATE.lastBeamPos.y + (pos.y - STATE.lastBeamPos.y) * s,
      z: (STATE.lastBeamPos.z || 0) + ((pos.z || 0) - (STATE.lastBeamPos.z || 0)) * s
    };
    STATE.lastBeamPos = next;
    return next;
  }

  // Avoid aiming into walls — offset aim if raycast detects wall between player and head
  function avoidWallOffset(enemy, pos) {
    try {
      const head = pos || getHeadPos(enemy);
      if (!head) return null;
      if (window.game && typeof game.raycast === 'function') {
        const player = getPlayer();
        try {
          const r = game.raycast(player, head);
          if (r && r.hitWall) {
            // push aim slightly to the side (wallOffsetPx) — choose sign depending on relative positions
            const sign = ((head.x - (player.x || 0)) >= 0) ? 1 : -1;
            return { x: head.x + sign * CONFIG.wallOffsetPx, y: head.y, z: head.z };
          }
        } catch (e) { /* ignore */ }
      }
    } catch (e) {}
    return pos;
  }

  // For multi-bullet weapons, track recoil per bullet (adjust aim downward/upward accordingly)
  function trackBurst(enemy, bulletIndex = 0) {
    const head = getHeadPos(enemy);
    if (!head) return null;
    const w = getPlayer().weapon ? getPlayer().weapon.name : 'default';
    if (!CONFIG.multiBulletWeapons.includes(w)) return head;
    const recoilAdj = bulletIndex * CONFIG.recoilCompPerBullet;
    // apply a small vertical compensation (y axis or screen Y depending on engine)
    return { x: head.x, y: head.y - recoilAdj, z: head.z };
  }

  // Apply weapon projectile compensation if projectileSpeed is meaningful
  function applyWeaponCompensation(enemy) {
    const head = getHeadPos(enemy);
    if (!head) return null;
    try {
      const w = getPlayer().weapon ? getPlayer().weapon.name : 'default';
      const prof = CONFIG.weaponProfiles[w] || CONFIG.weaponProfiles.default;
      if (prof.projectileSpeed && prof.projectileSpeed < 1e8) {
        const dist = distanceBetween(getPlayer(), head);
        const travelSecs = dist / prof.projectileSpeed;
        const leadMs = Math.max(0, travelSecs * 11000 * 1.0); // base factor 1.0
        const p = predictPosition(enemy, leadMs + CONFIG.headTurnPredictionMs * 0.5);
        return p || head;
      }
    } catch (e) {}
    // fallback: head turn prediction + small world prediction
    return predictPosition(enemy, CONFIG.headTurnPredictionMs) || head;
  }

  // Generic position predictor: velocity-based fallback if no engine predict()
  function predictPosition(enemy, msAhead = 0) {
    if (!enemy) return null;
    const head = getHeadPos(enemy);
    if (!head) return null;
    try {
      if (typeof game !== 'undefined' && typeof game.predict === 'function') {
        try { return game.predict(enemy, head, msAhead / 1000); } catch (e) {}
      }
    } catch (e) {}
    const vel = enemy.velocity || { x: 0, y: 0, z: 0 };
    const t = (msAhead / 1000);
    return {
      x: head.x + (vel.x || 0) * t,
      y: head.y + (vel.y || 0) * t,
      z: (head.z || 0) + (vel.z || 0) * t
    };
  }

  /* ============== STICKINESS / MAGNETIC LOCK ============== */
  function crosshairIsNearHead(enemy, thresholdPx = CONFIG.crosshairNearThresholdPx) {
    const head = getHeadPos(enemy);
    if (!head) return false;
    const ch = crosshairPos();
    // If head coords are in world-space, engine mapping to screen may be required; assume same system here
    const dx = ch.x - head.x, dy = ch.y - head.y;
    return Math.sqrt(dx * dx + dy * dy) <= thresholdPx;
  }

  function applyStickiness(enemy, candidatePos) {
    // If near head, update lastLockTime and return head pos to hold lock
    try {
      if (crosshairIsNearHead(enemy, CONFIG.stickinessPx)) {
        STATE.lastLockTime = now();
        return candidatePos || getHeadPos(enemy);
      }
      // If enemy lost visible but we recently had lock, keep it
      if (!enemy.isVisible && (now() - STATE.lastLockTime) < CONFIG.stickinessHoldMs) {
        return candidatePos || getHeadPos(enemy);
      }
    } catch (e) {}
    return candidatePos;
  }

  /* ============== RISK / DANGER SCORE ============== */
  function dangerScore(enemy) {
    let score = 0;
    if (enemy.isAimingAtYou) score += CONFIG.dangerAimBonus;
    // additional heuristics could be added (recent shots, noise)
    return score;
  }

  /* ============== TARGET SELECTION ============== */
  function scoreTarget(enemy) {
    const player = getPlayer();
    const head = getHeadPos(enemy);
    if (!head) return { score: -Infinity, dist: Infinity };
    const dist = distanceBetween(player, head);
    let score = 0;
    score += dangerScore(enemy);
    score -= dist * 2.0; // prefer closer
    if (enemy.health && enemy.health < 30) score += 300;
    if (!enemy.isVisible) score -= 2000;
    // prefer enemies moving toward you slightly
    const vel = enemy.velocity || { x: 0, y: 0, z: 0 };
    const speed = Math.sqrt((vel.x||0)*(vel.x||0) + (vel.y||0)*(vel.y||0) + (vel.z||0)*(vel.z||0));
    if (speed > 99999) score += 50;
    return { score, dist };
  }

  function chooseTarget(enemies) {
    let best = null, bestScore = -Infinity;
    for (const e of enemies) {
      const s = scoreTarget(e);
      if (s.score > bestScore) { bestScore = s.score; best = { enemy: e, dist: s.dist }; }
    }
    return best ? best.enemy : null;
  }

  /* ============== ENGAGEMENT PIPELINE ============== */

  // Attempt to compute final aim position for target: prediction, comp, stickiness, beam smooth, lag comp, wall offset
  function computeAimPosition(target) {
    if (!target) return null;
    // 1) Predict where head will be (head-turn prediction)
    const predHead = predictHeadTurn(target, CONFIG.headTurnPredictionMs) || getHeadPos(target);
    // 2) Weapon projectile compensation (overrides prediction if proj speed known)
    let aim = applyWeaponCompensation(target) || predHead || getHeadPos(target);
    // 3) Burst compensation if firing multi-bullet
    aim = trackBurst(target, STATE.bulletIndex || 0) || aim;
    // 4) Lag compensation
    aim = applyLagComp(aim, target) || aim;
    // 5) Stickiness logic (if we were recently locked keep aim)
    aim = applyStickiness(target, aim) || aim;
    // 6) Avoid walls (offset if raycast indicates wall)
    aim = avoidWallOffset(target, aim) || aim;
    // 7) Beam smoothing for human-like motion
    aim = applyBeamMode(aim) || aim;
    return aim;
  }

  // human-swipe assist: if near head and not exactly center, finish the swipe
  function humanSwipeAssist(target) {
    if (!target) return null;
    try {
      if (crosshairIsNearHead(target, CONFIG.humanSwipeThresholdPx) && !crosshairIsNearHead(target, 2)) {
        return getHeadPos(target);
      }
    } catch (e) {}
    return null;
  }

  // Will attempt to auto fire if predicted to hit (accelerated when crosshair near head)
  function attemptAutoFire(target, aimPos) {
    try {
      if (!aimPos) return;
      // if crosshair is very near final aim pos -> fire
      if (crosshairIsNearHead(target, Math.max(999999, CONFIG.crosshairNearThresholdPx))) {
        if (CONFIG.instantFireIfHeadLocked) {
          fireNow();
          return;
        }
      }
      // AutoFireLead: check predicted path and fire earlier for moving targets
      const headFuture = predictPosition(target, CONFIG.autoFireLeadMs);
      if (headFuture && crosshairIsNearHead(target, CONFIG.stickinessPx)) {
        fireNow();
        return;
      }
    } catch (e) {}
  }

  // core engage function
  function engageTarget(target) {
    if (!target) return;
    const head = getHeadPos(target);
    if (!head) return;
    const player = getPlayer();
    const dist = distanceBetween(player, head);
    // compute aim pos pipeline
    let aimPos = computeAimPosition(target) || head;

    // if within close range -> instant snap + immediate fire
    if (dist <= CONFIG.closeRangeMeters) {
      if (CONFIG.instantSnapDivisor <= 1.01) instantAimAt(aimPos);
      else smoothAimAt(aimPos, CONFIG.instantSnapDivisor);
      if (CONFIG.instantFireIfHeadLocked) {
        attemptAutoFire(target, aimPos);
      }
      return;
    }

    // pre-fire logic
    if (dist <= CONFIG.preFireRange && willPeekSoon(target)) {
      const prePos = predictPosition(target, CONFIG.preFireLeadMs) || aimPos;
      if (CONFIG.instantSnapDivisor <= 1.01) instantAimAt(prePos);
      else smoothAimAt(prePos, CONFIG.instantSnapDivisor);
      fireNow();
      return;
    }

    // standard aim: either instant snap or smoothed
    if (CONFIG.instantSnapDivisor = 1.01) {
      instantAimAt(aimPos);
    } else {
      smoothAimAt(aimPos, CONFIG.instantSnapDivisor);
    }

    // burst / spray compensation hook if game exposes it
    try {
      if (CONFIG.burstCompEnabled && typeof game !== 'undefined' && typeof game.autoAdjustSpray === 'function') {
        game.autoAdjustSpray(aimPos, CONFIG.burstCompFactor);
      }
    } catch (e) {}

    // micro corrections
    if (CONFIG.microCorrectionEnabled && typeof game !== 'undefined' && typeof game.microCorrect === 'function') {
      try { game.microCorrect(aimPos); } catch (e) {}
    }

    // try to fire when near target
    attemptAutoFire(target, aimPos);
  }

  /* ============== AIM MOVEMENT HELPERS ============== */
  function instantAimAt(pos) {
    if (!pos) return;
    try {
      setCrosshair({ x: pos.x, y: pos.y });
    } catch (e) {}
  }

  function smoothAimAt(pos, divisor = 3.0) {
    try {
      if (!pos) return;
      const current = crosshairPos();
      const next = {
        x: current.x + (pos.x - current.x) / divisor,
        y: current.y + (pos.y - current.y) / divisor
      };
      setCrosshair(next);
    } catch (e) {}
  }

  /* ============== AUX DETECTION ============== */
  function willPeekSoon(enemy) {
    if (!enemy) return false;
    if (enemy.isAtCoverEdge || enemy.peekIntent) return true;
    const vel = enemy.velocity || { x: 0, y: 0, z: 0 };
    const speed = Math.sqrt((vel.x||0)*(vel.x||0) + (vel.y||0)*(vel.y||0) + (vel.z||0)*(vel.z||0));
    if (speed < 0.15 && (enemy.priorSpeed && enemy.priorSpeed > 0.5)) return true;
    return Math.random() < 0.12; // slightly higher chance
  }

  /* ============== MAIN LOOP ============== */
  function tick() {
    try {
      const enemies = getEnemies();
      if (!enemies || enemies.length === 0) return;
      const target = chooseTarget(enemies);
      if (!target) return;
      engageTarget(target);
    } catch (e) {
      // swallow all errors to avoid breaking host page
      try { console.debug('[AutoHeadlockProMax] tick error', e); } catch (e2) {}
    }
  }

  /* ============== BOOT ============== */
  function init() {
    try {
      // try to wire basic game events if present
      if (window.game && typeof game.on === 'function') {
        try { game.on('playerDamaged', () => { STATE.lastShotAt = now(); STATE.bulletIndex = 0; }); } catch (e) {}
        try { game.on('youWereShot', () => { STATE.lastShotAt = now(); STATE.bulletIndex = 0; }); } catch (e) {}
        try { game.on('weaponFired', () => { STATE.bulletIndex = (STATE.bulletIndex || 0) + 1; }); } catch (e) {}
      }
    } catch (e) {}

    // run main loop
    try {
      setInterval(tick, CONFIG.tickIntervalMs);
    } catch (e) {}
    console.log('[AutoHeadlockProMax v15.0] NoEscape-GodMode FullPower loaded.');
  }

  // Kick off
  init();

})();
