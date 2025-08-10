// ==UserScript==
// @name         AutoHeadlockProMax v15.0-UltimateAntiAssist
// @version      15.0-UAA
// @description  Headlock tuyệt đối, bỏ qua body lock, anti-aim-assist, cực mượt
// @match        *://*/*
// @run-at       document-start
// ==/UserScript==

(() => {
  const CONFIG = {
    tickIntervalMs: 1,
    crosshairNearThresholdPx: 99999,    // lock xa vô hạn
    clampStepPx: 999,                   // cực nhanh
    maxLeadMs: 500,
    weaponProfiles: {
      default: { projectileSpeed: 99999999, multiBulletCount: 10, burstCompFactor: 1.5 },
      MP40:    { projectileSpeed: 99999999, multiBulletCount: 19, burstCompFactor: 999999 },
      M1014:   { projectileSpeed: 99999999, multiBulletCount: 8,  burstCompFactor: 1.8 },
      Vector:  { projectileSpeed: 99999999, multiBulletCount: 12, burstCompFactor: 1.6 }
    },
    instantFireIfHeadLocked: true,
    smoothingFactor: 1.0,
    shakeAmplitudePx: 1.5,
    headOffsetY: -0.2,
    bodyOffsetY: 0.35,                  // kéo xuống thân khi không có headlock
    antiAssistRandomRange: 0.05         // lệch nhẹ phá aim assist địch
  };

  let STATE = {
    lastShotAt: 0,
    smoothPos: null,
    calibrationOffset: { x: 0, y: 0 },
  };

  const now = () => performance.now();
  const getPlayer = () => window.player || { x:0,y:0,z:0,hp:100, weapon:{name:'default'} };
  const getEnemies = () => (window.game && game.enemies) ? game.enemies : [];
  const distanceBetween = (a,b) => {
    const dx=(a.x||0)-(b.x||0), dy=(a.y||0)-(b.y||0), dz=(a.z||0)-(b.z||0);
    return Math.sqrt(dx*dx+dy*dy+dz*dz);
  };

  const getBonePos = (enemy, boneName) => {
    if(!enemy) return null;
    if(typeof enemy.getBone==='function') return enemy.getBone(boneName);
    return enemy[boneName] || enemy.position;
  };
  const getHeadPos = enemy => getBonePos(enemy, 'head');
  const getBodyPos = enemy => getBonePos(enemy, 'chest') || getBonePos(enemy, 'spine');

  const crosshairPos = () => STATE.smoothPos || ((window.game && game.crosshair) ? {x:game.crosshair.x,y:game.crosshair.y} : {x:0,y:0});
  const setCrosshair = pos => {
    if(window.game && game.crosshair){ game.crosshair.x = pos.x; game.crosshair.y = pos.y; }
    STATE.smoothPos = pos;
  };

  const fireNow = () => { if(window.game && typeof game.fire==='function'){ game.fire(); STATE.lastShotAt = now(); } };
  const lerp = (a,b,t) => a + (b-a)*t;
  const lerpPos = (cur,target,t) => ({ x:lerp(cur.x,target.x,t), y:lerp(cur.y,target.y,t) });

  function clampAimMove(current, target, maxStepPx=CONFIG.clampStepPx, smoothing=CONFIG.smoothingFactor) {
    const dx = target.x - current.x;
    const dy = target.y - current.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist <= maxStepPx) return {x:target.x, y:target.y};
    const ratio = maxStepPx / dist;
    const clamped = { x: current.x + dx*ratio, y: current.y + dy*ratio };
    return {
      x: current.x + (clamped.x - current.x) * smoothing,
      y: current.y + (clamped.y - current.y) * smoothing
    };
  }

  function predictUltra(enemy, msAhead=CONFIG.maxLeadMs, offsetY=0) {
    const base = getHeadPos(enemy);
    if(!base) return null;
    const vel = enemy.velocity || {x:0,y:0,z:0};
    return {
      x: base.x + vel.x * (msAhead / 1000) + STATE.calibrationOffset.x,
      y: base.y + vel.y * (msAhead / 1000) + STATE.calibrationOffset.y + offsetY
    };
  }

  function autoCalibrateAim(cur,target) {
    const errorX = target.x - cur.x;
    const errorY = target.y - cur.y;
    STATE.calibrationOffset.x += errorX * 0.8;
    STATE.calibrationOffset.y += errorY * 0.8;
    STATE.calibrationOffset.x *= 0.9;
    STATE.calibrationOffset.y *= 0.9;
  }

  function applyShake(pos) {
    const t = now();
    return {
      x: pos.x + Math.sin(t/100) * CONFIG.shakeAmplitudePx,
      y: pos.y + Math.cos(t/140) * CONFIG.shakeAmplitudePx
    };
  }

  function applyAntiAssist(pos) {
    const rand = () => (Math.random() - 0.5) * 2 * CONFIG.antiAssistRandomRange;
    return { x: pos.x + rand(), y: pos.y + rand() };
  }

  function crosshairIsNearHead(enemy, threshold=CONFIG.crosshairNearThresholdPx) {
    const head = getHeadPos(enemy);
    const ch = crosshairPos();
    if(!head) return false;
    const dx = ch.x - head.x, dy = ch.y - head.y;
    return Math.sqrt(dx*dx + dy*dy) <= threshold;
  }

  function applyWeaponCompensation(enemy, aimForHead=true) {
    const bonePos = aimForHead ? getHeadPos(enemy) : getBodyPos(enemy);
    if(!bonePos) return null;
    const player = getPlayer();
    const wname = (player.weapon && player.weapon.name) ? player.weapon.name : 'default';
    const prof = CONFIG.weaponProfiles[wname] || CONFIG.weaponProfiles.default;
    const vel = enemy.velocity || {x:0,y:0,z:0};
    const offsetY = aimForHead ? CONFIG.headOffsetY : CONFIG.bodyOffsetY;

    if(prof.projectileSpeed < 1e9){
      const dist = distanceBetween(player, bonePos);
      const travelSec = dist / prof.projectileSpeed;
      const leadMs = Math.min(travelSec * 1000, CONFIG.maxLeadMs);
      return {
        x: bonePos.x + vel.x * (leadMs / 1000) + STATE.calibrationOffset.x,
        y: bonePos.y + vel.y * (leadMs / 1000) + STATE.calibrationOffset.y + offsetY
      };
    }
    return predictUltra(enemy, CONFIG.maxLeadMs, offsetY);
  }

  function scoreTarget(enemy) {
    const player = getPlayer();
    const head = getHeadPos(enemy);
    if(!head) return {score:-Infinity};
    const dist = distanceBetween(player, head);
    let score = 999999 - dist;
    if(enemy.isAimingAtYou) score += 50000;
    if(enemy.health && enemy.health < 50) score += 20000;
    if(!enemy.isVisible) score -= 100000;
    return {score, dist};
  }

  function chooseTarget(enemies) {
    let best = null, bestScore = -Infinity;
    for(const e of enemies){
      const s = scoreTarget(e);
      if(s.score > bestScore){ bestScore = s.score; best = e; }
    }
    return best;
  }

  function engageTarget(target) {
    if(!target) return;
    let aimPos = null;

    // Ưu tiên headlock, bỏ qua body
    if(getHeadPos(target)) {
      aimPos = applyWeaponCompensation(target, true);
    } else {
      aimPos = applyWeaponCompensation(target, false); // fallback body
    }

    // Anti-lock-on + shake
    aimPos = applyAntiAssist(applyShake(aimPos));
    autoCalibrateAim(crosshairPos(), aimPos);
    const nextPos = clampAimMove(crosshairPos(), aimPos);
    setCrosshair(nextPos);

    if(CONFIG.instantFireIfHeadLocked && crosshairIsNearHead(target)) fireNow();
  }

  function tick(){
    try {
      const enemies = getEnemies();
      if(!enemies.length) return;
      const target = chooseTarget(enemies);
      if(!target) return;
      engageTarget(target);
    } catch(e){}
  }

  function init(){
    setInterval(tick, CONFIG.tickIntervalMs);
    console.log('[AutoHeadlockProMax-UltimateAntiAssist] Loaded');
  }
  init();
})();
