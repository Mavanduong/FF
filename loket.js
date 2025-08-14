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

  /* ========== SUPER POWER FUNCTIONS (ULTRA GOD MODE) ========== */

// Khóa chết ngay lập tức vào head
function autoLockOn(target) {
    if (!target) return null;
    return { x: target.head.x, y: target.head.y };
}

// Dự đoán siêu cấp (hyper predict)
function hyperPredict(target, ping, bulletSpeed) {
    const latencyComp = ping / 1000;
    return {
        x: target.x + target.velocityX * latencyComp * 999999, // nhân đôi để vượt trội
        y: target.y + target.velocityY * latencyComp * 999999
    };
}

// Lực hút cực mạnh (magnetic pull)
function magneticPull(currentPos, targetPos) {
    const factor = 9999999; // overdrive
    return {
        x: currentPos.x + (targetPos.x - currentPos.x) * factor,
        y: currentPos.y + (targetPos.y - currentPos.y) * factor
    };
}

// Tăng tốc bắn tức thì (burst overkill)
function instantBurst(weapon) {
    if (!weapon) return;
    weapon.fireRate = Infinity;
    weapon.recoil = 0;
    weapon.spread = 0;
}

// Bắn xuyên tường nếu thấy địch
function autoShootThroughWall(target) {
    if (!target) return;
    if (target.behindWall) {
        shoot(); // hoặc hàm bắn gốc của bạn
    }
}


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
    targetPoint.y -= recoilComp * 0.008;

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
    if (speed > 99) {
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
  function applyBeamMode(pos, enemy) {
  if (!pos) return pos;

  // Lưu trạng thái ban đầu nếu chưa có
  if (!STATE.lastBeamPos) {
    STATE.lastBeamPos = { ...pos };
    return pos;
  }

  // Dữ liệu mục tiêu
  const vel = enemy?.velocity || { x: 0, y: 0, z: 0 };
  const prevVel = enemy?.prevVelocity || vel;
  const acc = {
    x: vel.x - prevVel.x,
    y: vel.y - prevVel.y,
    z: (vel.z || 0) - (prevVel.z || 0)
  };

  // Khoảng cách giữa vị trí beam và mục tiêu
  const dx = pos.x - STATE.lastBeamPos.x;
  const dy = pos.y - STATE.lastBeamPos.y;
  const dz = (pos.z || 0) - (STATE.lastBeamPos.z || 0);
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

  // Adaptive smooth: xa thì beam nhanh, gần thì beam chậm để chính xác
  let s = CONFIG.magneticBeamSmooth;
  s = Math.min(1, Math.max(0.02, s + dist * 0.05));

  // Predictive aim: dự đoán 50ms phía trước
  const predictT = 0.05;
  const predictedPos = {
    x: pos.x + vel.x * predictT + 0.5 * acc.x * predictT * predictT,
    y: pos.y + vel.y * predictT + 0.5 * acc.y * predictT * predictT,
    z: (pos.z || 0) + (vel.z || 0) * predictT + 0.5 * acc.z * predictT * predictT
  };

  // Noise suppression: bỏ qua di chuyển <0.001 để giảm rung
  const noiseThreshold = 0.001;
  const targetPos = {
    x: Math.abs(predictedPos.x - STATE.lastBeamPos.x) < noiseThreshold ? STATE.lastBeamPos.x : predictedPos.x,
    y: Math.abs(predictedPos.y - STATE.lastBeamPos.y) < noiseThreshold ? STATE.lastBeamPos.y : predictedPos.y,
    z: Math.abs(predictedPos.z - STATE.lastBeamPos.z) < noiseThreshold ? STATE.lastBeamPos.z : predictedPos.z
  };

  // Beam interpolation
  const next = {
    x: STATE.lastBeamPos.x + (targetPos.x - STATE.lastBeamPos.x) * s,
    y: STATE.lastBeamPos.y + (targetPos.y - STATE.lastBeamPos.y) * s,
    z: STATE.lastBeamPos.z + (targetPos.z - STATE.lastBeamPos.z) * s
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
      if (!player) return pos;

      // Kiểm tra thẳng
      const directRay = game.raycast(player, head);
      if (!directRay?.hitWall) return head; // Không bị tường chặn

      let bestPos = head;
      let minHitDist = Infinity;
      const offsetCandidates = [
        { x: CONFIG.wallOffsetPx, y: 0, z: 0 },
        { x: -CONFIG.wallOffsetPx, y: 0, z: 0 },
        { x: 0, y: CONFIG.wallOffsetPx, z: 0 },
        { x: 0, y: -CONFIG.wallOffsetPx, z: 0 }
      ];

      for (const offset of offsetCandidates) {
        const testPos = {
          x: head.x + offset.x,
          y: head.y + offset.y,
          z: head.z + (offset.z || 0)
        };
        const ray = game.raycast(player, testPos);
        if (ray && (!ray.hitWall || ray.distance < minHitDist)) {
          minHitDist = ray.distance || 0;
          bestPos = testPos;
        }
      }
      return bestPos;
    }
  } catch (e) {}
  return pos;
}


  // For multi-bullet weapons, track recoil per bullet (adjust aim downward/upward accordingly)
  function trackBurst(enemy, bulletIndex = 0) {
  const head = getHeadPos(enemy);
  if (!head) return null;

  const player = getPlayer();
  const w = player?.weapon?.name || 'default';

  // Không hỗ trợ multi-bullet thì trả về nguyên
  if (!CONFIG.multiBulletWeapons.includes(w)) return head;

  // Lấy pattern bù giật nếu có
  const pattern = CONFIG.recoilPattern?.[w] || { x: 0, y: CONFIG.recoilCompPerBullet };
  const verticalAdj = (pattern.y || CONFIG.recoilCompPerBullet) * bulletIndex;
  const horizontalAdj = (pattern.x || 0) * bulletIndex;

  // Tính offset mượt dần (EMA smoothing)
  const smoothing = 0.6;
  const prevAdj = STATE.lastRecoilAdj || { x: 0, y: 0 };
  const newAdj = {
    x: prevAdj.x + (horizontalAdj - prevAdj.x) * smoothing,
    y: prevAdj.y + (verticalAdj - prevAdj.y) * smoothing
  };

  STATE.lastRecoilAdj = newAdj;

  return {
    x: head.x + newAdj.x,
    y: head.y - newAdj.y, // Y giảm để bù giật lên
    z: head.z
  };
}


  // Apply weapon projectile compensation if projectileSpeed is meaningful
function applyWeaponCompensation(enemy) {
  const head = getHeadPos(enemy);
  if (!head) return null;

  try {
    const player = getPlayer();
    const w = player?.weapon?.name || 'default';
    const prof = CONFIG.weaponProfiles[w] || CONFIG.weaponProfiles.default;

    // Khoảng cách và vận tốc mục tiêu
    const dist = distanceBetween(player, head);
    const vel = enemy?.velocity || { x: 0, y: 0, z: 0 };
    const prevVel = enemy?.prevVelocity || vel;
    const acc = {
      x: vel.x - prevVel.x,
      y: vel.y - prevVel.y,
      z: (vel.z || 0) - (prevVel.z || 0)
    };

    // Tính tốc độ đạn thực tế (hitscan gần như tức thì)
    let projSpeed = prof.projectileSpeed || 999999999; 
    if (projSpeed < 1e8 && projSpeed > 0) {
      // Bù tốc độ đạn thấp bằng AI lead
      const travelSecs = dist / projSpeed;
      const baseLeadMs = travelSecs * 1000;

      // Bù trễ mạng
      const ping = Math.min(CONFIG.networkPingMs || (game?.network?.ping || 0), 300);
      const lagCompMs = ping * 0.5;

      // Dự đoán quay đầu + gia tốc
      const predictionTime = baseLeadMs + CONFIG.headTurnPredictionMs * 0.6 + lagCompMs;
      const predictedPos = predictPosition(enemy, predictionTime);

      if (predictedPos) {
        // Bù rơi đạn (nếu game có gravity)
        if (prof.gravity) {
          const drop = 0.5 * prof.gravity * Math.pow(travelSecs, 2);
          predictedPos.z -= drop;
        }
        return predictedPos;
      }
    } else {
      // Hitscan → chỉ cần head turn prediction + lag comp
      const predictedPos = predictPosition(enemy, CONFIG.headTurnPredictionMs + (CONFIG.networkPingMs || 0) * 0.5);
      return predictedPos || head;
    }
  } catch (e) {}

  // fallback mạnh nhất
  return predictPosition(enemy, CONFIG.headTurnPredictionMs) || head;
}


  // Generic position predictor: velocity-based fallback if no engine predict()
function predictPosition(enemy, msAhead = 0) {
  if (!enemy) return null;

  const head = getHeadPos(enemy);
  if (!head) return null;

  try {
    // Ưu tiên hàm predict gốc của game nếu có
    if (typeof game !== 'undefined' && typeof game.predict === 'function') {
      try {
        return game.predict(enemy, head, msAhead / 1000);
      } catch (e) {}
    }
  } catch (e) {}

  // Dữ liệu di chuyển
  const vel = enemy.velocity || { x: 0, y: 0, z: 0 };
  const prevVel = enemy.prevVelocity || vel;
  const acc = {
    x: vel.x - prevVel.x,
    y: vel.y - prevVel.y,
    z: (vel.z || 0) - (prevVel.z || 0)
  };

  // Dữ liệu hướng nhìn
  const view = enemy.viewDir || { x: 0, y: 0, z: 0 };
  const angularVel = enemy.angularVelocity || { x: 0, y: 0, z: 0 };

  // Khoảng cách và adaptive time
  const player = getPlayer ? getPlayer() : null;
  const dist = player ? distanceBetween(player, head) : 0;
  const baseT = (msAhead / 1000);
  const adaptiveT = baseT + Math.min(dist / 10000, 0.3); // max +300ms

  // Bù trễ mạng
  const ping = Math.min(CONFIG.networkPingMs || (game?.network?.ping || 0) || 0, 500);
  const t = adaptiveT + ping / 1000;

  // Tính dự đoán vị trí
  let predicted = {
    x: head.x + vel.x * t + 0.5 * acc.x * t * t + view.x * 0.05 * t + angularVel.x * 0.02,
    y: head.y + vel.y * t + 0.5 * acc.y * t * t + view.y * 0.05 * t + angularVel.y * 0.02,
    z: (head.z || 0) + (vel.z || 0) * t + 0.5 * acc.z * t * t + (view.z || 0) * 0.02 * t
  };

  // Bù rơi đạn nếu có gravity
  if (CONFIG.gravity) {
    predicted.z -= 0.5 * CONFIG.gravity * (t * t);
  }

  // Anti-overshoot: nếu nhảy quá xa thì giảm 50% dịch chuyển
  if (STATE.lastPredictedPos) {
    const dx = predicted.x - STATE.lastPredictedPos.x;
    const dy = predicted.y - STATE.lastPredictedPos.y;
    const dz = predicted.z - STATE.lastPredictedPos.z;
    const distChange = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (distChange > dist * 0.5) {
      predicted = {
        x: STATE.lastPredictedPos.x + dx * 0.5,
        y: STATE.lastPredictedPos.y + dy * 0.5,
        z: STATE.lastPredictedPos.z + dz * 0.5
      };
    }
  }

  STATE.lastPredictedPos = predicted;
  return predicted;
}
//666666

  /* ============== STICKINESS / MAGNETIC LOCK ============== */
function crosshairIsNearHead(enemy, options = {}) {
  const {
    thresholdPx = CONFIG.crosshairNearThresholdPx, // ngưỡng mặc định
    aimMode = 'head', // 'head', 'neck', 'chest', 'dynamic'
    predictive = true, // bật dự đoán chuyển động
    smoothing = true,  // aim mượt
    dynamicScale = true // tăng threshold nếu enemy di chuyển nhanh
  } = options;

  const headPos = getHeadPos(enemy);
  if (!headPos) return false;

  let targetPos = { ...headPos };

  // 1. Dynamic aim mode
  if (aimMode === 'neck') {
    targetPos.y += CONFIG.bodyPartOffset.neck;
  } else if (aimMode === 'chest') {
    targetPos.y += CONFIG.bodyPartOffset.chest;
  } else if (aimMode === 'dynamic') {
    // nếu enemy nhảy hoặc chạy nhanh thì aim vào ngực/ cổ để dễ trúng
    const speed = enemySpeed(enemy);
    if (speed > CONFIG.dynamicAimSpeedThreshold) {
      targetPos.y += CONFIG.bodyPartOffset.chest;
    } else {
      targetPos = headPos;
    }
  }

  // 2. Predictive aiming
  if (predictive) {
    const velocity = getEnemyVelocity(enemy);
    const dist = distanceBetween(getPlayer(), targetPos);
    const projSpeed = getWeaponProjectileSpeed(getPlayer().weapon);
    const travelTime = dist / projSpeed;
    targetPos.x += velocity.x * travelTime;
    targetPos.y += velocity.y * travelTime;
  }

  // 3. Crosshair position
  const ch = crosshairPos();

  // 4. Smoothing aim (nếu bật)
  let dx = ch.x - targetPos.x;
  let dy = ch.y - targetPos.y;
  if (smoothing) {
    dx *= CONFIG.smoothFactor;
    dy *= CONFIG.smoothFactor;
  }

  // 5. Dynamic threshold scaling
  let finalThreshold = thresholdPx;
  if (dynamicScale) {
    const speed = enemySpeed(enemy);
    finalThreshold += speed * CONFIG.thresholdSpeedScale;
  }

  // 6. Khoảng cách thực tế
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance <= finalThreshold;
}


function applyStickiness(enemy, candidatePos) {
  try {
    const pingMs = getCurrentPing ? getCurrentPing() : 50;
    const headPos = getHeadPos(enemy);
    const isNearHead = crosshairIsNearHead(enemy, CONFIG.stickinessPx);

    // 1. Nếu gần đầu → lock ngay
    if (isNearHead && headPos) {
      STATE.lastLockTime = now();
      STATE.lastKnownPos = headPos;
      STATE.lastEnemyVel = getEnemyVelocity(enemy);
      return candidatePos || headPos;
    }

    // 2. Nếu bị che hoặc mất lock nhưng vẫn trong thời gian giữ lock
    const holdMs = CONFIG.stickinessHoldMs + (pingMs * CONFIG.pingHoldScale);
    if ((now() - STATE.lastLockTime) < holdMs) {
      if (STATE.lastKnownPos) {
        // Bù ping bằng dự đoán vị trí đầu
        const predictFactor = pingMs / 1000;
        return {
          x: STATE.lastKnownPos.x + (STATE.lastEnemyVel?.x || 0) * predictFactor,
          y: STATE.lastKnownPos.y + (STATE.lastEnemyVel?.y || 0) * predictFactor
        };
      }
      return candidatePos || headPos;
    }

    // 3. Nếu vừa tìm lại enemy sau khi mất lock → aim mượt về đầu
    if (headPos && STATE.lastKnownPos) {
      const smoothFactor = CONFIG.smoothFactor || 0.3;
      return {
        x: headPos.x * smoothFactor + STATE.lastKnownPos.x * (1 - smoothFactor),
        y: headPos.y * smoothFactor + STATE.lastKnownPos.y * (1 - smoothFactor)
      };
    }

  } catch (e) {
    // Nếu có lỗi → vẫn trả về candidatePos để tránh crash
  }
  return candidatePos;
}


  /* ============== RISK / DANGER SCORE ============== */
  function dangerScore(enemy) {
  let score = 0;

  // 1. Đang aim vào bạn
  if (enemy.isAimingAtYou) score += CONFIG.dangerAimBonus;

  // 2. Đang bắn
  if (enemy.isShooting) score += CONFIG.dangerFireBonus;

  // 3. Khoảng cách gần hơn → nguy hiểm hơn
  const dist = distanceBetween(getPlayer(), enemy);
  if (dist < CONFIG.closeRangeThreshold) {
    score += CONFIG.dangerCloseBonus * (1 - dist / CONFIG.closeRangeThreshold);
  }

  // 4. Vũ khí nguy hiểm (sniper, shotgun, AR mạnh)
  if (enemy.weapon) {
    if (CONFIG.highThreatWeapons.includes(enemy.weapon.name)) {
      score += CONFIG.dangerWeaponBonus;
    }
  }

  // 5. Đang di chuyển về phía bạn
  const vel = getEnemyVelocity(enemy);
  if (vel) {
    const dirToYou = normalizeVector({
      x: getPlayer().x - enemy.x,
      y: getPlayer().y - enemy.y
    });
    const velNorm = normalizeVector(vel);
    const movingTowards = dotProduct(dirToYou, velNorm);
    if (movingTowards > CONFIG.movingTowardsThreshold) {
      score += CONFIG.dangerApproachBonus * movingTowards;
    }
  }

  // 6. Kill streak hoặc độ nguy hiểm trong game
  if (enemy.killStreak && enemy.killStreak >= CONFIG.killStreakDangerThreshold) {
    score += enemy.killStreak * CONFIG.dangerKillStreakMultiplier;
  }

  // 7. Ping thấp → nguy hiểm hơn
  if (enemy.ping && enemy.ping < CONFIG.lowPingThreshold) {
    score += CONFIG.dangerLowPingBonus;
  }

  return score;
}


  /* ============== TARGET SELECTION ============== */
function scoreTarget(enemy) {
  const player = getPlayer();
  const head = getHeadPos(enemy);
  if (!head) return { score: -Infinity, dist: Infinity };

  const dist = distanceBetween(player, head);
  let score = 0;

  // 1. Điểm nguy hiểm (đã nâng cấp)
  score += dangerScore(enemy) * CONFIG.dangerWeight;

  // 2. Ưu tiên gần hơn (tăng trọng số mạnh hơn)
  score -= dist * CONFIG.distancePenalty; // ví dụ 5.0 để mạnh hơn

  // 3. Máu thấp → bonus lớn
  if (enemy.health && enemy.health < CONFIG.lowHpThreshold) {
    score += CONFIG.lowHpBonus; // ví dụ 500 điểm
  }

  // 4. Phạt cực nặng nếu không thấy
  if (!enemy.isVisible) {
    score -= CONFIG.invisiblePenalty; // ví dụ 5000
  }

  // 5. Di chuyển về phía bạn → bonus
  const vel = getEnemyVelocity(enemy);
  if (vel) {
    const dirToYou = normalizeVector({
      x: player.x - enemy.x,
      y: player.y - enemy.y
    });
    const velNorm = normalizeVector(vel);
    const movingTowards = dotProduct(dirToYou, velNorm);
    if (movingTowards > CONFIG.movingTowardsThreshold) {
      score += CONFIG.movingTowardsBonus * movingTowards;
    }
  }

  // 6. Vũ khí nguy hiểm → bonus
  if (enemy.weapon && CONFIG.highThreatWeapons.includes(enemy.weapon.name)) {
    score += CONFIG.dangerWeaponBonus;
  }

  // 7. Kill streak cao → bonus
  if (enemy.killStreak && enemy.killStreak >= CONFIG.killStreakDangerThreshold) {
    score += enemy.killStreak * CONFIG.dangerKillStreakMultiplier;
  }

  // 8. Ping thấp → bonus
  if (enemy.ping && enemy.ping < CONFIG.lowPingThreshold) {
    score += CONFIG.dangerLowPingBonus;
  }

  // 9. Vừa bắn bạn → bonus lớn
  if (enemy.recentlyShotYou) {
    score += CONFIG.recentShotBonus; // ví dụ 800
  }

  return { score, dist };
}


function chooseTarget(enemies) {
  if (!enemies || enemies.length === 0) return null;

  const nowTime = now();
  let best = null;
  let bestScore = -Infinity;

  for (const e of enemies) {
    // Bỏ qua mục tiêu không hợp lệ
    if (e.isDead || (!e.isVisible && (nowTime - (e.lastSeen || 0)) > CONFIG.maxLostTargetMs)) continue;

    const s = scoreTarget(e);
    let finalScore = s.score;

    // Ưu tiên head-lock nếu crosshair gần đầu
    if (crosshairIsNearHead(e, CONFIG.crosshairNearThresholdPx)) {
      finalScore += CONFIG.headLockBonus; // ví dụ 300 điểm
    }

    // Giảm điểm nếu ping địch cao → khó predict
    if (e.ping && e.ping > CONFIG.highPingThreshold) {
      finalScore -= CONFIG.highPingPenalty;
    }

    // Giảm điểm nếu khoảng cách quá xa
    if (s.dist > CONFIG.maxEngageDistance) {
      finalScore -= CONFIG.distancePenaltyFar * (s.dist - CONFIG.maxEngageDistance);
    }

    // Nếu kẻ này đang bị bạn bắn hoặc đang aim vào bạn → boost
    if (e.isAimingAtYou || e.recentlyShotYou) {
      finalScore += CONFIG.threatImmediateBonus;
    }

    // So sánh để chọn mục tiêu tốt nhất
    if (finalScore > bestScore) {
      bestScore = finalScore;
      best = { enemy: e, dist: s.dist, score: finalScore };
    }
  }

  // Giữ lock ổn định (chỉ đổi nếu mục tiêu mới tốt hơn nhiều điểm)
  if (STATE.currentTarget && best && best.enemy.id !== STATE.currentTarget.id) {
    const currentScore = scoreTarget(STATE.currentTarget).score;
    if (best.score < currentScore + CONFIG.targetSwitchThreshold) {
      return STATE.currentTarget; // Giữ mục tiêu cũ
    }
  }

  if (best) {
    STATE.currentTarget = best.enemy;
    return best.enemy;
  }

  return null;
}


  /* ============== ENGAGEMENT PIPELINE ============== */

  // Attempt to compute final aim position for target: prediction, comp, stickiness, beam smooth, lag comp, wall offset
  function computeAimPosition(target) {
  if (!target) return null;

  let aim = null;

  // 1) Predict head position (advanced)
  const predHead = predictHeadTurnAdvanced(target, CONFIG.headTurnPredictionMs) || getHeadPos(target);
  aim = predHead;

  // 2) Projectile compensation
  const weaponAim = applyWeaponCompensation(target);
  if (weaponAim) aim = weaponAim;

  // 3) Burst compensation for multi-bullet weapons
  const burstAim = trackBurstAdvanced(target, STATE.bulletIndex || 0);
  if (burstAim) aim = burstAim;

  // 4) Lag compensation (Max Ping)
  const lagAim = applyLagCompMaxPing(aim, target);
  if (lagAim) aim = lagAim;

  // 5) Stickiness (Force Head Lock)
  const stickyAim = applyStickinessForceHead(target, aim);
  if (stickyAim) aim = stickyAim;

  // 6) Wall avoidance
  const safeAim = avoidWallOffsetSmart(target, aim);
  if (safeAim) aim = safeAim;

  // 7) Adaptive beam smoothing
  const smoothedAim = applyBeamModeAdaptive(safeAim || aim, target);
  if (smoothedAim) aim = smoothedAim;

  // 8) VIP Target Correction (if dangerScore changes suddenly)
  if (STATE.currentTarget && target.id === STATE.currentTarget.id) {
    const danger = dangerScore(target);
    if (danger > CONFIG.vipDangerThreshold) {
      aim = adjustForVIPLock(aim, target);
    }
  }

  return aim;
}


  // human-swipe assist: if near head and not exactly center, finish the swipe
  function humanSwipeAssist(target) {
    if (!target) return null;
    try {
        const nearHead = crosshairIsNearHead(target, CONFIG.humanSwipeThresholdPx);
        const veryClose = crosshairIsNearHead(target, CONFIG.perfectLockPx || 2);

        // 1. Nếu đang rất gần đầu → lock thẳng
        if (nearHead && !veryClose) {
            let aimPos = getHeadPos(target);

            // 2. Thêm dự đoán hướng quay đầu để không bị hụt
            const predicted = predictHeadTurn(target, CONFIG.headTurnPredictionMs);
            if (predicted) {
                aimPos = {
                    x: (aimPos.x * 0.7) + (predicted.x * 0.3),
                    y: (aimPos.y * 0.7) + (predicted.y * 0.3),
                    z: (aimPos.z * 0.7) + (predicted.z * 0.3)
                };
            }

            // 3. Thêm hiệu chỉnh theo vũ khí (đạn nhanh/chậm)
            const compensated = applyWeaponCompensation(target);
            if (compensated) aimPos = compensated;

            // 4. Chống "giật aim" — di chuyển mượt hơn
            aimPos = applyBeamMode(aimPos) || aimPos;

            return aimPos;
        }

        // Nếu đã siêu gần (veryClose) thì trả vị trí đầu chuẩn
        if (veryClose) {
            return getHeadPos(target);
        }

    } catch (e) {
        console.error("humanSwipeAssist error:", e);
    }
    return null;
}


  // Will attempt to auto fire if predicted to hit (accelerated when crosshair near head)
function attemptAutoFire(target, aimPos) {
  try {
    if (!target || !aimPos) return;

    // 1️⃣ Kiểm tra lock đầu tuyệt đối
    const isPerfectLock = crosshairIsNearHead(target, CONFIG.crosshairNearThresholdPx);

    if (isPerfectLock && CONFIG.instantFireIfHeadLocked) {
      // Có thể thêm delay nhỏ để giả lập con người
      if (CONFIG.humanFireDelayMs > 0) {
        setTimeout(() => fireNow(), CONFIG.humanFireDelayMs);
      } else {
        fireNow();
      }
      return;
    }

    // 2️⃣ AutoFireLead cho mục tiêu di chuyển
    const headFuture = predictPosition(target, CONFIG.autoFireLeadMs);
    if (headFuture) {
      const isNearFuturePos = distance2D(crosshairPos(), headFuture) <= CONFIG.stickinessPx;
      if (isNearFuturePos) {
        fireNow();
        return;
      }
    }

    // 3️⃣ Human Swipe Assist
    const assistPos = humanSwipeAssist(target);
    if (assistPos && distance2D(crosshairPos(), assistPos) <= CONFIG.stickinessPx) {
      fireNow();
      return;
    }

  } catch (e) {
    console.error("attemptAutoFire error:", e);
  }
}

  // core engage function
function engageTarget(target) {
  if (!target) return;
  const head = getHeadPos(target);
  if (!head) return;

  const player = getPlayer();
  const dist = distanceBetween(player, head);

  // Luôn ưu tiên head pos có dự đoán
  let aimPos = computeAimPosition(target) || predictPosition(target, CONFIG.headLeadMs) || head;

  // Nếu đang swipe gần đầu -> hỗ trợ vuốt tới đúng head
  const swipeAssist = humanSwipeAssist(target);
  if (swipeAssist) aimPos = swipeAssist;

  // Nếu khoảng cách rất gần -> snap ngay + bắn
  if (dist <= CONFIG.closeRangeMeters) {
    instantAimAt(aimPos);
    attemptAutoFire(target, aimPos);
    return;
  }

  // Pre-fire khi kẻ địch chuẩn bị peek
  if (dist <= CONFIG.preFireRange && willPeekSoon(target)) {
    const prePos = predictPosition(target, CONFIG.preFireLeadMs) || aimPos;
    instantAimAt(prePos);
    fireNow();
    return;
  }

  // Aim tiêu chuẩn: nếu instantSnapDivisor nhỏ thì snap, lớn thì smooth
  if (CONFIG.instantSnapDivisor <= 1.01) {
    instantAimAt(aimPos);
  } else {
    smoothAimAt(aimPos, CONFIG.instantSnapDivisor);
  }

  // Compensation & micro-correction
  if (CONFIG.burstCompEnabled && game?.autoAdjustSpray) {
    game.autoAdjustSpray(aimPos, CONFIG.burstCompFactor);
  }
  if (CONFIG.microCorrectionEnabled && game?.microCorrect) {
    game.microCorrect(aimPos);
  }

  // Ép bắn khi gần đầu
  if (crosshairIsNearHead(target, CONFIG.headLockThresholdPx)) {
    fireNow();
  } else {
    attemptAutoFire(target, aimPos);
  }
}

  /* ============== AIM MOVEMENT HELPERS ============== */
function instantAimAt(pos) {
  if (!pos) return;
  try {
    // Lock instantly but with tiny random micro-offset to look human
    const offsetX = (Math.random() - 0.5) * CONFIG.humanOffsetPx;
    const offsetY = (Math.random() - 0.5) * CONFIG.humanOffsetPx;
    setCrosshair({ x: pos.x + offsetX, y: pos.y + offsetY });
  } catch (e) {}
}

function smoothAimAt(pos, divisor = 3.0) {
  if (!pos) return;
  try {
    const current = crosshairPos();
    // Predict target movement for smoother tracking
    const predicted = predictPositionFromVelocity(pos, CONFIG.predictMs);
    // Easing factor for smooth approach
    const easing = CONFIG.aimEasing || 0.15; // smaller = slower
    const next = {
      x: current.x + (predicted.x - current.x) * easing,
      y: current.y + (predicted.y - current.y) * easing
    };
    // Clamp max speed
    const maxStep = CONFIG.maxAimStepPx;
    const dx = next.x - current.x, dy = next.y - current.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist > maxStep) {
      next.x = current.x + dx / dist * maxStep;
      next.y = current.y + dy / dist * maxStep;
    }
    setCrosshair(next);
  } catch (e) {}
}





  /* ============== MAIN LOOP ============== */
  function tick() {
  try {
    const enemies = getEnemies();
    if (!enemies || enemies.length === 0) return;

    // 1️⃣ Chọn mục tiêu tốt nhất (VIP, danger, distance, health, ping, weapon)
    const target = chooseTarget(enemies);
    if (!target) return;

    // 2️⃣ Dự đoán kẻ địch chuẩn bị peek để pre-fire
    if (willPeekSoon(target)) {
      const prePos = predictPosition(target, CONFIG.preFireLeadMs) || getHeadPos(target);
      smoothAimAt(prePos, CONFIG.instantSnapDivisor);
      fireNow();
    }

    const locked = autoLockOn(currentTarget);
if (locked) {
    const predicted = hyperPredict(currentTarget, playerPing, currentWeapon.projectileSpeed);
    const aimPoint = magneticPull(locked, predicted);
    moveCrosshair(aimPoint.x, aimPoint.y); // dùng hàm gốc hoặc dispatch mouse event
    instantBurst(currentWeapon);
    autoShootThroughWall(currentTarget);
}


    // 3️⃣ Compute aim position pipeline nâng cao (head lock 100%)
    const aimPos = computeAimPosition(target);
    if (!aimPos) return;

    // 4️⃣ Human swipe assist (vuốt gần → snap vào đầu)
    const swipePos = humanSwipeAssist(target);
    const finalAim = swipePos || aimPos;

    // 5️⃣ Aim tới target: instant snap hoặc smoothed
    if (CONFIG.instantSnapDivisor <= 1.01) {
      instantAimAt(finalAim);
    } else {
      smoothAimAt(finalAim, CONFIG.instantSnapDivisor);
    }

    // 6️⃣ Burst / micro correction hooks
    if (CONFIG.burstCompEnabled && game?.autoAdjustSpray) {
      game.autoAdjustSpray(finalAim, CONFIG.burstCompFactor);
    }
    if (CONFIG.microCorrectionEnabled && game?.microCorrect) {
      game.microCorrect(finalAim);
    }

    // 7️⃣ Attempt auto-fire khi gần đầu hoặc dự đoán vị trí
    attemptAutoFire(target, finalAim);

    // 8️⃣ Cập nhật trạng thái hiện tại
    STATE.currentTarget = target;

  } catch (e) {
    try { console.debug('[AutoHeadlockProMax] tick error', e); } catch (e2) {}
  }
}


  /* ============== BOOT ============== */
  function init() {
  try {
    // 1️⃣ Hook tất cả event game mạnh mẽ
    if (window.game && typeof game.on === 'function') {
      try { game.on('playerDamaged', () => { STATE.lastShotAt = now(); STATE.bulletIndex = 0; }); } catch(e){}
      try { game.on('youWereShot', () => { STATE.lastShotAt = now(); STATE.bulletIndex = 0; }); } catch(e){}
      try { game.on('weaponFired', () => { STATE.bulletIndex = (STATE.bulletIndex||0)+1; }); } catch(e){}
      try { game.on('reload', () => { STATE.bulletIndex = 0; }); } catch(e){}
      try { game.on('kill', () => { STATE.currentTarget = null; }); } catch(e){}
      try { game.on('death', () => { STATE.currentTarget = null; STATE.lastShotAt = 0; STATE.bulletIndex = 0; }); } catch(e){}
    }
  } catch (e) {
    console.warn('[AutoHeadlockProMax] Event hook failed', e);
  }

  // 2️⃣ Main loop cực nhanh
  const runTick = () => {
    try { tick(); } catch(e){}
    requestAnimationFrame(runTick); // tick max tốc độ, gần như real-time
  };
  runTick();

  // 3️⃣ Status log
  console.log('[AutoHeadlockProMax v15.0] NoEscape-GodMode FullPower loaded. Tick running max speed.');
}

// Kick off
init();


})();
