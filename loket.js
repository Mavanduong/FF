// ==UserScript==
// @name         AutoHeadlockProMax v14.4c-HumanBreaker-FullPower-NoAntiBan
// @version      14.4c
// @description  FULL POWER: instant head snap + pre-fire + overtrack + weapon compensation + burst handling. AntiBan removed (max performance).
// @match        *://*/*
// @run-at       document-start
// ==/UserScript==

(() => {
  /* ============== CONFIG ============== */
  const CONFIG = {
  // Chọn mode: 'godmode' hoặc 'realistic'
  mode: 'godmode',  

  /* ====== GENERAL SETTINGS ====== */
  closeRangeMeters: Infinity,         // Luôn coi như gần
  preFireRange: Infinity,             // Luôn pre-fire
  maxEngageDistance: Infinity,        // Không giới hạn
  instantSnapDivisor: 1e-10,          // Snap ngay lập tức
  overtrackLeadFactor: 10.0,          // Dẫn cực mạnh
  preFireLeadMs: 9999,                // Pre-fire cực lớn
  instantFireIfHeadLocked: true,      // Luôn bắn nếu lock đầu
  crosshairNearThresholdPx: Infinity, // Luôn coi như gần đầu
  tickIntervalMs: 1,                  // 1ms vòng lặp (max phản ứng)
  burstCompEnabled: true,
  burstCompFactor: 99.99,             // Triệt tiêu giật

  /* ====== WEAPON PROFILES ====== */
  weaponProfiles: {
    /* === GodMode: tất cả Infinity === */
    godmode: {
      default: { projectileSpeed: Infinity },
      MP40: { projectileSpeed: Infinity },
      Vector: { projectileSpeed: Infinity },
      UMP: { projectileSpeed: Infinity },
      Thompson: { projectileSpeed: Infinity },
      MP5: { projectileSpeed: Infinity },
      P90: { projectileSpeed: Infinity },
      M1014: { projectileSpeed: Infinity },
      M1887: { projectileSpeed: Infinity },
      SPAS12: { projectileSpeed: Infinity },
      MAG7: { projectileSpeed: Infinity },
      Trogon: { projectileSpeed: Infinity },
      SCAR: { projectileSpeed: Infinity },
      AK47: { projectileSpeed: Infinity },
      AN94: { projectileSpeed: Infinity },
      Groza: { projectileSpeed: Infinity },
      M4A1: { projectileSpeed: Infinity },
      FAMAS: { projectileSpeed: Infinity },
      XM8: { projectileSpeed: Infinity },
      AUG: { projectileSpeed: Infinity },
      AWM: { projectileSpeed: Infinity },
      KAR98K: { projectileSpeed: Infinity },
      Dragunov: { projectileSpeed: Infinity },
      M82B: { projectileSpeed: Infinity },
      M60: { projectileSpeed: Infinity },
      M249: { projectileSpeed: Infinity },
      DesertEagle: { projectileSpeed: Infinity },
      M500: { projectileSpeed: Infinity }
    },

    /* === Realistic: tốc độ đạn gần giống thực tế === */
    realistic: {
      default: { projectileSpeed: 999999 }, // fallback
      MP40: { projectileSpeed: 1400 },
      Vector: { projectileSpeed: 1500 },
      UMP: { projectileSpeed: 1200 },
      Thompson: { projectileSpeed: 1250 },
      MP5: { projectileSpeed: 1300 },
      P90: { projectileSpeed: 1350 },
      M1014: { projectileSpeed: 1200 },
      M1887: { projectileSpeed: 1150 },
      SPAS12: { projectileSpeed: 1100 },
      MAG7: { projectileSpeed: 1180 },
      Trogon: { projectileSpeed: 1300 },
      SCAR: { projectileSpeed: 1600 },
      AK47: { projectileSpeed: 1650 },
      AN94: { projectileSpeed: 1620 },
      Groza: { projectileSpeed: 1700 },
      M4A1: { projectileSpeed: 1650 },
      FAMAS: { projectileSpeed: 1550 },
      XM8: { projectileSpeed: 1600 },
      AUG: { projectileSpeed: 1580 },
      AWM: { projectileSpeed: 3000 },
      KAR98K: { projectileSpeed: 2800 },
      Dragunov: { projectileSpeed: 2700 },
      M82B: { projectileSpeed: 2900 },
      M60: { projectileSpeed: 1500 },
      M249: { projectileSpeed: 1500 },
      DesertEagle: { projectileSpeed: 1100 },
      M500: { projectileSpeed: 1050 }
    }
  }
};

/* ====== GET WEAPON PROFILE (ULTRA BOOST) ====== */
const profileCache = {};

function getWeaponProfile(weaponName) {
  if (!weaponName) weaponName = 'default';

  // Normalize weapon name (chuyển về dạng chuẩn)
  const name = weaponName.trim().toUpperCase();

  // Check cache trước để tăng tốc
  if (profileCache[name]) return profileCache[name];

  // Lấy profiles của mode hiện tại
  let profiles = CONFIG.weaponProfiles[CONFIG.mode];

  // Nếu mode sai hoặc chưa có => fallback sang realistic
  if (!profiles) {
    console.warn(`[AutoConfig] Mode '${CONFIG.mode}' không hợp lệ! Fallback -> realistic`);
    CONFIG.mode = 'realistic';
    profiles = CONFIG.weaponProfiles.realistic;
  }

  // Nếu đang GodMode => auto Infinity
  if (CONFIG.mode === 'godmode') {
    profileCache[name] = { projectileSpeed: Infinity, aimAssist: true, recoilControl: true };
    return profileCache[name];
  }

  // Tìm profile chính xác
  let profile = profiles[name];

  // Nếu không có profile cụ thể -> dự đoán theo loại
  if (!profile) {
    if (/AWM|M82B|KAR98K|DRAGUNOV/i.test(name)) {
      profile = { projectileSpeed: 2900 }; // Sniper
    } else if (/M1014|M1887|SPAS|MAG7|TROGON/i.test(name)) {
      profile = { projectileSpeed: 1150 }; // Shotgun
    } else if (/MP40|VECTOR|UMP|MP5|P90|THOMPSON/i.test(name)) {
      profile = { projectileSpeed: 1300 }; // SMG
    } else if (/AK|SCAR|GROZA|M4A1|AN94|AUG|XM8|FAMAS/i.test(name)) {
      profile = { projectileSpeed: 1600 }; // AR
    } else if (/M60|M249/i.test(name)) {
      profile = { projectileSpeed: 1500 }; // LMG
    } else if (/DEAGLE|M500/i.test(name)) {
      profile = { projectileSpeed: 1100 }; // Pistol
    } else {
      profile = profiles.default || { projectileSpeed: 999999 };
    }
  }

  // Bổ sung tính năng dynamic boost: nếu ping cao, tăng tốc
  const ping = window.player && player.ping ? player.ping : 0;
  if (ping > 100) {
    profile.projectileSpeed *= 1.5; // Tăng tốc để bù lag
  }

  // Cache lại để lần sau lấy nhanh
  profileCache[name] = profile;
  return profile;
}

  /* ============== STATE ============== */
 let STATE = {
    // Thời gian bắn cuối cùng
    lastShotAt: 0,

    // Thống kê hiệu suất
    hits: 0,
    misses: 0,
    totalShots: 0,

    // Độ chính xác (tính theo %)
    accuracy: 0,

    // Trạng thái cảm biến thông minh
    currentTarget: null,
    previousTarget: null,

    // Theo dõi hành vi người chơi
    reactionTime: [], // ms từng lần bắn
    avgReactionTime: 0,

    // Theo dõi khoảng cách mục tiêu để điều chỉnh aim
    targetDistances: [],
    avgDistance: 0,

    // Điều chỉnh thông minh
    dynamicSensitivity: 1.0,
    aimCorrection: { x: 0, y: 0 },

    // Chế độ an toàn & phân tích
    stabilityScore: 100,
    riskLevel: "LOW",

    // Học máy offline để điều chỉnh aim theo thói quen
    patternMemory: [], // lưu lịch sử bắn để dự đoán
    lastPattern: null,

    // Theo dõi combo kill
    killStreak: 0,
    maxKillStreak: 0,

    // Tối ưu ping
    lastPing: 0,
    pingHistory: [],
    avgPing: 0,

    // Dự đoán hành vi địch
    enemyBehavior: {
        movementPatterns: [],
        avgSpeed: 0,
        lastDirection: null
    },

    // Reset thông minh (khi đổi trận)
    reset() {
        this.lastShotAt = 0;
        this.hits = 0;
        this.misses = 0;
        this.totalShots = 0;
        this.accuracy = 0;
        this.killStreak = 0;
        this.patternMemory = [];
        this.enemyBehavior.movementPatterns = [];
    },

    // Cập nhật khi bắn
    updateShot(hit, distance, reaction, ping) {
        this.totalShots++;
        hit ? this.hits++ : this.misses++;

        // Cập nhật accuracy
        this.accuracy = ((this.hits / this.totalShots) * 100).toFixed(2);

        // Lưu khoảng cách & thời gian phản ứng
        if (distance) this.targetDistances.push(distance);
        if (reaction) this.reactionTime.push(reaction);
        if (ping) {
            this.lastPing = ping;
            this.pingHistory.push(ping);
        }

        // Cập nhật trung bình
        this.avgDistance = this.targetDistances.reduce((a, b) => a + b, 0) / this.targetDistances.length || 0;
        this.avgReactionTime = this.reactionTime.reduce((a, b) => a + b, 0) / this.reactionTime.length || 0;
        this.avgPing = this.pingHistory.reduce((a, b) => a + b, 0) / this.pingHistory.length || 0;

        // Điều chỉnh sensitivity dựa trên độ chính xác
        this.dynamicSensitivity = Math.max(0.1, 1 - (this.accuracy / 200));

        // Nếu miss quá nhiều -> tự động tăng aimCorrection
        if (this.misses > this.hits) {
            this.aimCorrection.x += 0.1;
            this.aimCorrection.y += 0.1;
        }

        // Lưu pattern cho AI dự đoán
        this.patternMemory.push({ hit, distance, reaction, time: Date.now() });
    }
};


  /* ============== UTILITIES / ADAPTERS ============== */
 /* ====== TIME ENGINE PRO ====== */
// Tối ưu đo thời gian chính xác (perf + fallback)
function now() {
  return (performance && performance.now) ? performance.now() : Date.now();
}

/* ====== PLAYER SMART FETCH v2.0 ====== */
function getPlayer() {
  const basePlayer = window.player || {};

  // Tạo AI Player với fallback thông minh
  return {
    x: basePlayer.x ?? 0,
    y: basePlayer.y ?? 0,
    z: basePlayer.z ?? 0,
    hp: basePlayer.hp ?? 100,
    isAlive: (basePlayer.hp ?? 100) > 0,
    weapon: basePlayer.weapon || { name: 'default', ammo: Infinity },

    // Thêm dữ liệu nâng cao:
    velocity: basePlayer.velocity || { x: 0, y: 0, z: 0 },
    direction: basePlayer.direction || 0,
    lastUpdate: now(),

    // Thêm phương thức tiện ích
    distanceTo(target) {
      return Math.sqrt(
        Math.pow((target.x - this.x), 2) +
        Math.pow((target.y - this.y), 2) +
        Math.pow((target.z - this.z), 2)
      );
    },

    predictPosition(timeMs = 100) {
      return {
        x: this.x + (this.velocity.x * timeMs / 1000),
        y: this.y + (this.velocity.y * timeMs / 1000),
        z: this.z + (this.velocity.z * timeMs / 1000)
      };
    }
  };
}


  function getEnemies(options = {}) {
  const {
    maxDistance = Infinity,    // Giới hạn tầm bắn
    includeDead = false,       // Có lấy kẻ chết không? (Mặc định: không)
    sortBy = 'distance',       // distance | hp | headPriority
    teamCheck = true           // Bỏ qua đồng đội
  } = options;

  if (!window.game || !Array.isArray(game.enemies)) return [];

  const player = getPlayer();
  const enemies = game.enemies.filter(enemy => {
    if (!enemy) return false;

    // Kiểm tra trạng thái sống
    if (!includeDead && enemy.hp <= 0) return false;

    // Kiểm tra team (bỏ qua đồng đội)
    if (teamCheck && enemy.team === player.team) return false;

    // Tính khoảng cách
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const dz = (enemy.z || 0) - (player.z || 0);
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Kiểm tra trong tầm
    if (distance > maxDistance) return false;

    enemy.distance = distance; // lưu cho sort
    return true;
  });

  // Sắp xếp theo chế độ
  enemies.sort((a, b) => {
    switch (sortBy) {
      case 'hp':
        return a.hp - b.hp; // Ưu tiên máu thấp
      case 'headPriority':
        return (b.isHeadVisible ? 1 : 0) - (a.isHeadVisible ? 1 : 0);
      default: // distance
        return a.distance - b.distance;
    }
  });

  return enemies;
}

/** ========== ULTRA DISTANCE CALCULATION SYSTEM V2.0 ========== **/

// Bộ nhớ tạm để tránh tính toán lặp lại (cache optimization)
const DISTANCE_CACHE = new Map();

/**
 * Tính khoảng cách 3D giữa hai điểm, có tối ưu:
 * - Hỗ trợ cache để tăng tốc
 * - Tự động dự đoán nếu mục tiêu đang di chuyển (predictive distance)
 * - Tích hợp mode: "euclidean", "manhattan", "chebyshev"
 */
function distanceBetween(a, b, options = {}) {
    const mode = options.mode || 'euclidean';  // Các mode: euclidean, manhattan, chebyshev
    const useCache = options.cache ?? true;
    const predict = options.predict ?? true;

    // Tạo key duy nhất cho cache
    const key = `${a.x},${a.y},${a.z}|${b.x},${b.y},${b.z}|${mode}|${predict}`;
    if (useCache && DISTANCE_CACHE.has(key)) {
        return DISTANCE_CACHE.get(key);
    }

    // Lấy tọa độ thực tế (dự đoán nếu bật predict)
    const ax = a.x || 0, ay = a.y || 0, az = a.z || 0;
    const bx = predict && b.vx ? b.x + b.vx * 0.05 : b.x || 0; // 0.05s dự đoán vị trí
    const by = predict && b.vy ? b.y + b.vy * 0.05 : b.y || 0;
    const bz = predict && b.vz ? b.z + b.vz * 0.05 : b.z || 0;

    let dist;
    if (mode === 'manhattan') {
        dist = Math.abs(ax - bx) + Math.abs(ay - by) + Math.abs(az - bz);
    } else if (mode === 'chebyshev') {
        dist = Math.max(Math.abs(ax - bx), Math.abs(ay - by), Math.abs(az - bz));
    } else {
        // Mặc định Euclidean
        const dx = ax - bx;
        const dy = ay - by;
        const dz = az - bz;
        dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    if (useCache) {
        DISTANCE_CACHE.set(key, dist);
        setTimeout(() => DISTANCE_CACHE.delete(key), 50); // cache 50ms để tối ưu
    }

    return dist;
}

/** ========== BONUS FEATURE ========== **/
/**
 * Tính khoảng cách tối ưu cho mục tiêu **ưu tiên** dựa trên:
 * - Khoảng cách
 * - Góc nhìn
 * - Máu (ưu tiên địch yếu)
 * - Độ nguy hiểm (địch đang ngắm bắn)
 */
function smartTargetScore(player, enemy) {
    const baseDistance = distanceBetween(player, enemy, { predict: true });
    const healthFactor = (enemy.hp || 100) / 100;
    const dangerFactor = enemy.isAimingAtPlayer ? 2 : 1; // nếu địch đang ngắm thì nguy hiểm x2
    const angleFactor = Math.abs((enemy.angleToPlayer || 0)) / 90; // góc càng nhỏ càng tốt

    // Điểm càng thấp càng ưu tiên
    return baseDistance * healthFactor * dangerFactor * (1 + angleFactor);
}

/**
 * Lấy kẻ địch tối ưu (smart targeting)
 */
function getBestEnemy(player, enemies) {
    return enemies.reduce((best, e) => {
        const score = smartTargetScore(player, e);
        return score < best.score ? { enemy: e, score } : best;
    }, { enemy: null, score: Infinity }).enemy;
}
// Lấy vị trí đầu cực chính xác + fallback thông minh
function getHeadPos(enemy) {
  if (!enemy) return null;

  // Ưu tiên gọi API nếu có
  if (typeof enemy.getBone === 'function') {
    const bone = enemy.getBone('head');
    if (bone && bone.x !== undefined) return bone;
  }

  // Nếu có thuộc tính head riêng
  if (enemy.head && enemy.head.x !== undefined) return enemy.head;

  // Nếu có bounding box, lấy điểm cao nhất (top center)
  if (enemy.boundingBox) {
    return {
      x: (enemy.boundingBox.min.x + enemy.boundingBox.max.x) / 2,
      y: enemy.boundingBox.max.y,
      z: (enemy.boundingBox.min.z + enemy.boundingBox.max.z) / 2
    };
  }

  // Cuối cùng, ước lượng từ position (cộng offset chiều cao 1.6m)
  if (enemy.position) {
    return {
      x: enemy.position.x,
      y: enemy.position.y + (enemy.height || 1.6),
      z: enemy.position.z
    };
  }

  return null;
}

// Vị trí crosshair chính xác, fallback về trung tâm màn hình
function crosshairPos() {
  if (window.game && game.crosshair && game.crosshair.x !== undefined) {
    return { x: game.crosshair.x, y: game.crosshair.y };
  }

  // Nếu không có dữ liệu game → lấy viewport center
  const width = window.innerWidth || 1920;
  const height = window.innerHeight || 1080;
  return { x: width / 2, y: height / 2 };
}


  function setCrosshair(pos, smooth = false, speed = 0.5) {
    if (window.game && game.crosshair && pos) {
        if (smooth) {
            // Mượt hóa di chuyển crosshair
            const dx = pos.x - game.crosshair.x;
            const dy = pos.y - game.crosshair.y;

            game.crosshair.x += dx * speed;
            game.crosshair.y += dy * speed;
        } else {
            // Snap ngay lập tức (instant lock)
            game.crosshair.x = pos.x;
            game.crosshair.y = pos.y;
        }
    }
}
const STATE = {
  lastShotAt: 0,
  autoFireEnabled: true,
  aimSmooth: 0.000001 // gần như instant
};

function now() {
  return performance.now();
}

// Lấy vị trí đầu chính xác
function getHeadPos(enemy) {
  if (!enemy) return null;
  if (typeof enemy.getBone === 'function') return enemy.getBone('head');
  return enemy.head || enemy.position;
}

// Lấy vị trí crosshair hiện tại
function crosshairPos() {
  return (window.game && game.crosshair)
    ? { x: game.crosshair.x, y: game.crosshair.y }
    : { x: 0, y: 0 };
}

// Di chuyển crosshair đến vị trí mong muốn
function setCrosshair(pos) {
  if (window.game && game.crosshair) {
    game.crosshair.x = pos.x;
    game.crosshair.y = pos.y;
  }
}

// Hàm bắn ngay lập tức
function fireNow() {
  if (window.game && typeof game.fire === 'function') {
    game.fire();
    STATE.lastShotAt = now();
  }
}

// Dự đoán vị trí đầu (nếu enemy di chuyển)
function predictHead(enemy) {
  const head = getHeadPos(enemy);
  if (!head) return null;

  // Nếu có vận tốc, dự đoán 1 chút
  if (enemy.velocity) {
    return {
      x: head.x + enemy.velocity.x * 0.01,
      y: head.y + enemy.velocity.y * 0.01
    };
  }
  return head;
}

// Hàm chính: Auto Headshot MAX POWER
function autoHeadshot(enemy) {
  if (!enemy) return;

  const predicted = predictHead(enemy);
  if (!predicted) return;

  // Snap ngay lập tức
  setCrosshair(predicted);

  // Fire không delay
  if (STATE.autoFireEnabled) {
    fireNow();
  }
}

// Auto loop cho mọi frame
function startAutoAim() {
  requestAnimationFrame(function loop() {
    if (window.game && game.enemies) {
      const target = game.enemies.find(e => e && e.alive);
      if (target) {
        autoHeadshot(target);
      }
    }
    requestAnimationFrame(loop);
  });
}

startAutoAim();


  /* ============== PREDICTION & COMPENSATION ============== */
 function predictPosition(enemy, msAhead = 0) {
  if (!enemy) return null;

  const head = getHeadPos(enemy);
  const vel = enemy.velocity || { x: 0, y: 0, z: 0 };

  // Nếu game có hàm predict gốc thì tận dụng
  if (typeof game !== 'undefined' && typeof game.predict === 'function') {
    try {
      return game.predict(enemy, head, msAhead / 1000);
    } catch (e) { /* ignore */ }
  }

  // Auto tính thời gian dự đoán dựa trên khoảng cách + tốc độ đạn
  const weapon = STATE.currentWeapon || { projectileSpeed: 9999 }; // max nếu chưa có
  const dist = Math.sqrt((enemy.x - head.x) ** 2 + (enemy.y - head.y) ** 2);
  const autoMsAhead = (dist / weapon.projectileSpeed) * 1000;
  msAhead = Math.max(msAhead, autoMsAhead);

  // Dự đoán quỹ đạo nâng cấp: dùng acceleration giả định
  const accel = enemy.acceleration || { x: 0, y: 0, z: 0 };
  const t = msAhead / 1000;

  let predX = head.x + vel.x * t + 0.5 * accel.x * t * t;
  let predY = head.y + vel.y * t + 0.5 * accel.y * t * t;
  let predZ = (head.z || 0) + (vel.z || 0) * t + 0.5 * accel.z * t * t;

  // Auto headshot height adjust
  predY += (enemy.headHeight || 0.15);

  // Gravity compensation (nếu có)
  if (STATE.gravity && STATE.gravity.enabled) {
    predZ -= 0.5 * STATE.gravity.value * t * t;
  }

  // Smoothing cho mượt (loại jitter)
  const lastPred = STATE.lastPredicted || head;
  predX = lastPred.x + (predX - lastPred.x) * 0.9;
  predY = lastPred.y + (predY - lastPred.y) * 0.9;
  predZ = lastPred.z + (predZ - lastPred.z) * 0.9;

  STATE.lastPredicted = { x: predX, y: predY, z: predZ };

  return { x: predX, y: predY, z: predZ };
}

  //hhh

  function applyWeaponCompensation(enemy){
    const head = getHeadPos(enemy);
    if(!head) return null;

    const player = getPlayer();
    const wname = (player.weapon && player.weapon.name) ? player.weapon.name : 'default';
    const prof = CONFIG.weaponProfiles[wname] || CONFIG.weaponProfiles.default;

    // distance & lead calculation
    const dist = distanceBetween(player, head);
    let leadMs = 16 * CONFIG.overtrackLeadFactor; // default small lead

    if(prof.projectileSpeed && prof.projectileSpeed < 1e6){
        const travelSec = dist / prof.projectileSpeed;
        leadMs = travelSec * 1000 * CONFIG.overtrackLeadFactor;
    }

    leadMs = Math.min(250, leadMs); // giới hạn cực đại để tránh overshoot

    // dự đoán nâng cao: velocity + gia tốc
    const predicted = predictPosition(enemy, leadMs);
    if(predicted && enemy.acceleration){
        predicted.x += 0.5 * enemy.acceleration.x * (leadMs/1000)**2;
        predicted.y += 0.5 * enemy.acceleration.y * (leadMs/1000)**2;
        predicted.z += 0.5 * enemy.acceleration.z * (leadMs/1000)**2;
    }

    return predicted || head;
}
function crosshairIsNearHead(enemy, baseThresholdPx = CONFIG.crosshairNearThresholdPx){
    const head = getHeadPos(enemy);
    const ch = crosshairPos();
    if(!head) return false;

    const targetSizeFactor = enemy.height ? enemy.height / 180 : 1; // scale theo cao
    const dynamicThreshold = baseThresholdPx * targetSizeFactor;

    const dx = ch.x - head.x, dy = ch.y - head.y;
    return Math.sqrt(dx*dx + dy*dy) <= dynamicThreshold;
}
function instantAimAt(pos){
    if(!pos) return;
    const player = getPlayer();
    let targetPos = { x: pos.x, y: pos.y };

    // recoil compensation
    if(player.weapon && player.weapon.recoil){
        targetPos.y -= player.weapon.recoil.currentY || 0;
        targetPos.x -= player.weapon.recoil.currentX || 0;
    }

    // optional smoothing
    if(CONFIG.aimSmoothing > 0){
        const ch = crosshairPos();
        targetPos.x = ch.x + (targetPos.x - ch.x) / CONFIG.aimSmoothing;
        targetPos.y = ch.y + (targetPos.y - ch.y) / CONFIG.aimSmoothing;
    }

    setCrosshair(targetPos);
}

 function scoreTarget(enemy){
    const player = getPlayer();
    const head = getHeadPos(enemy);
    if(!head) return { score: -Infinity, dist: Infinity };

    const dist = distanceBetween(player, head);
    let score = 0;

    // ưu tiên enemy đang aim vào bạn
    if(enemy.isAimingAtYou) score += 10000;

    // giảm score theo khoảng cách
    score -= dist * 1.5;

    // ưu tiên enemy low hp
    if(enemy.health && enemy.health < 30) score += 500;

    // visibility cực kỳ quan trọng
    if(!enemy.isVisible) score -= 5000;

    // headshot factor: luôn ưu tiên head
    score += 100000; // tăng khủng để luôn nhắm head

    // threat factor: enemy đang di chuyển nhanh, bắn trước
    if(enemy.velocity){
        const speed = Math.sqrt(enemy.velocity.x**2 + enemy.velocity.y**2 + enemy.velocity.z**2);
        score += speed * 10;
    }

    return { score, dist };
}
function chooseTarget(enemies){
    let best = null, bestScore = -Infinity;
    for(const e of enemies){
        const s = scoreTarget(e);
        if(s.score > bestScore){ bestScore = s.score; best = e; }
    }

    if(best){
        // áp dụng trực tiếp headshot prediction
        const aimPos = applyWeaponCompensation(best);
        instantAimAt(aimPos); // crosshair bám đầu
    }

    return best;
}
function aimAtBestTarget(enemies){
    // chọn target mạnh mẽ nhất
    const target = chooseTarget(enemies);
    if(!target) return null;

    // lấy vị trí head dự đoán với weapon compensation
    const predictedHead = applyWeaponCompensation(target);

    // đặt crosshair ngay vị trí head (bù recoil & smoothing nếu có)
    instantAimAt(predictedHead);

    return target;
}


 /* ============== UTILITY FUNCTIONS ============== */
function distanceBetween(a, b){
    const dx = (a.x || 0) - (b.x || 0);
    const dy = (a.y || 0) - (b.y || 0);
    const dz = (a.z || 0) - (b.z || 0);
    return Math.sqrt(dx*dx + dy*dy + dz*dz);
}

function crosshairPos(){
    return game && typeof game.getCrosshairPos === 'function' ? game.getCrosshairPos() : {x:0, y:0};
}

function setCrosshair(pos){
    if(game && typeof game.setCrosshairPos === 'function'){
        game.setCrosshairPos(pos);
    }
}

/* ============== PREDICTION / AIM HELPERS ============== */
function applyWeaponCompensation(enemy){
    const head = getHeadPos(enemy);
    if(!head) return null;
    const player = getPlayer();
    const wname = (player.weapon && player.weapon.name) ? player.weapon.name : 'default';
    const prof = CONFIG.weaponProfiles[wname] || CONFIG.weaponProfiles.default;

    const dist = distanceBetween(player, head);
    let leadMs = 16 * CONFIG.overtrackLeadFactor;

    if(prof.projectileSpeed && prof.projectileSpeed < 1e6){
        const travelSec = dist / prof.projectileSpeed;
        leadMs = travelSec * 1000 * CONFIG.overtrackLeadFactor;
    }
    leadMs = Math.min(250, leadMs);

    const predicted = predictPosition(enemy, leadMs);
    if(predicted && enemy.acceleration){
        predicted.x += 0.5 * (enemy.acceleration.x || 0) * (leadMs/1000)**2;
        predicted.y += 0.5 * (enemy.acceleration.y || 0) * (leadMs/1000)**2;
        predicted.z += 0.5 * (enemy.acceleration.z || 0) * (leadMs/1000)**2;
    }
    return predicted || head;
}

function crosshairIsNearHead(enemy, thresholdPx = CONFIG.crosshairNearThresholdPx){
    const head = getHeadPos(enemy);
    const ch = crosshairPos();
    if(!head) return false;

    const targetSizeFactor = enemy.height ? enemy.height / 180 : 1;
    const dynamicThreshold = thresholdPx * targetSizeFactor;

    const dx = ch.x - head.x, dy = ch.y - head.y;
    return Math.sqrt(dx*dx + dy*dy) <= dynamicThreshold;
}

function instantAimAt(pos){
    if(!pos) return;
    const player = getPlayer();
    let targetPos = { x: pos.x, y: pos.y };

    // recoil compensation
    if(player.weapon && player.weapon.recoil){
        targetPos.y -= player.weapon.recoil.currentY || 0;
        targetPos.x -= player.weapon.recoil.currentX || 0;
    }

    // optional smoothing
    if(CONFIG.aimSmoothing > 0){
        const cur = crosshairPos();
        targetPos.x = cur.x + (targetPos.x - cur.x) / CONFIG.aimSmoothing;
        targetPos.y = cur.y + (targetPos.y - cur.y) / CONFIG.aimSmoothing;
    }

    setCrosshair(targetPos);
}

/* ============== ENGAGEMENT LOGIC ============== */
function willPeekSoon(enemy){
    if(!enemy) return false;
    if(enemy.isAtCoverEdge || enemy.peekIntent) return true;

    const vel = enemy.velocity || { x:0,y:0,z:0 };
    const speed = Math.sqrt(vel.x*vel.x + vel.y*vel.y + vel.z*vel.z);

    if(speed < 0.15 && (enemy.priorSpeed && enemy.priorSpeed > 0.5)) return true;
    return Math.random() < 0.08;
}

function engageTarget(target){
    if(!target) return;
    const player = getPlayer();
    const head = getHeadPos(target);
    if(!head) return;

    const dist = distanceBetween(player, head);
    const aimPos = applyWeaponCompensation(target) || head;

    // --- CLOSE RANGE: instant snap + fire ---
    if(dist <= CONFIG.closeRangeMeters){
        instantAimAt(aimPos);
        if(CONFIG.instantFireIfHeadLocked) fireNow();
        return;
    }

    // --- PRE-FIRE when peek-likely ---
    if(dist <= CONFIG.preFireRange && willPeekSoon(target)){
        const prePos = predictPosition(target, CONFIG.preFireLeadMs) || aimPos;
        instantAimAt(prePos);
        fireNow();
        return;
    }

    // --- MID/LONG RANGE: aggressive snap ---
    if(CONFIG.instantSnapDivisor <= 1.01){
        instantAimAt(aimPos);
    } else {
        const cur = crosshairPos();
        const next = {
            x: cur.x + (aimPos.x - cur.x) / CONFIG.instantSnapDivisor,
            y: cur.y + (aimPos.y - cur.y) / CONFIG.instantSnapDivisor
        };
        setCrosshair(next);
    }

    // --- BURST & recoil handling ---
    if(CONFIG.burstCompEnabled && typeof game !== 'undefined' && typeof game.autoAdjustSpray === 'function'){
        game.autoAdjustSpray(aimPos, CONFIG.burstCompFactor);
    }

    // --- HEAD LOCK FIRE ---
    const headThreshold = Math.max(5, 8 * (target.height/180 || 1));
    if(crosshairIsNearHead(target, headThreshold)){
        fireNow();
    }
}

/* ============== MAIN LOOP ============== */
function tickUltra(){
    try{
        const enemies = getEnemies();
        if(!enemies || enemies.length === 0) return;

        // lọc enemy có thể engage (visible hoặc threat cao)
        const validEnemies = enemies.filter(e => e.isVisible || e.isAimingAtYou);
        if(validEnemies.length === 0) return;

        // chọn target ưu tiên headshot
        const target = chooseTarget(validEnemies);
        if(!target) return;

        // engage target theo logic ultra headshot
        engageTarget(target);

    }catch(e){
        console.error('Tick error:', e);
    }
}

/* ============== FIRE HOOK (auto head aim khi bấm nút) ============== */
document.addEventListener('mousedown', (e) => {
    if(e.button === 0){ // nút trái chuột = fire
        const enemies = getEnemies();
        if(!enemies || enemies.length === 0) return;
        const target = chooseTarget(enemies);
        if(!target) return;
        const predictedHead = applyWeaponCompensation(target);
        instantAimAt(predictedHead);
        fireNow(); // bắn ngay
    }
});

/* ============== INIT ============== */
function initUltra(){
    // hook damage events nếu game có
    try{
        if(window.game && typeof game.on === 'function'){
            try{ game.on('playerDamaged', ()=>{ STATE.lastShotAt = now(); }); }catch(e){}
        }
    }catch(e){}

    // tick tự động (có thể tắt nếu chỉ muốn nhấn nút mới bắn)
    if(CONFIG.enableAutoTick){
        setInterval(tickUltra, CONFIG.tickIntervalMs);
    }

    console.log('[AutoHeadlockProMax v14.4c] ULTRA Headshot AI loaded.');
}

initUltra();


})();

