// ==UserScript==
// @name         AutoHeadlockProMax v15-GodMode-Silent-AllWeapon
// @version      15.0
// @description  Full GodMode: All guns instant hit, silent, head turn prediction, no overshoot, prefire, burst comp.
// @match        *://*/*
// @run-at       document-start
// ==/UserScript==

(() => {
  const CONFIG = {
    closeRangeMeters: Infinity,
    preFireRange: 40,
    maxEngageDistance: Infinity,
    instantSnapDivisor: 0.00001,
    overtrackLeadFactor: 10.0,
    preFireLeadMs: 120,
    projectileSpeed: 999999999, // ALL weapons use instant speed
    instantFireIfHeadLocked: true,
    crosshairNearThresholdPx: 9999,
    tickIntervalMs: 1,
    burstCompEnabled: true,
    burstCompFactor: 0,
    clampStepPx: 35,
    maxLeadMs: 80
  };

  let STATE = { lastShotAt: 0 };

  const now = () => Date.now();
  const getPlayer = () => window.player || { x:0,y:0,z:0, hp:100, weapon:{name:'default'} };
  const getEnemies = () => (window.game && game.enemies) ? game.enemies : [];
  const dist = (a,b) => Math.hypot((a.x||0)-(b.x||0), (a.y||0)-(b.y||0), (a.z||0)-(b.z||0));
  const getHead = e => (e?.getBone?.('head')) || e?.head || e?.position || null;
  const crosshair = () => (window.game?.crosshair) ? { x: game.crosshair.x, y: game.crosshair.y } : { x:0, y:0 };
  const setCrosshair = p => { if(window.game?.crosshair){ game.crosshair.x = p.x; game.crosshair.y = p.y; } };
  const fireNow = () => { if(window.game?.fire) { game.fire(); STATE.lastShotAt = now(); } };

  const clampAimMove = (cur, tgt, step=CONFIG.clampStepPx) => {
    const dx = tgt.x - cur.x, dy = tgt.y - cur.y;
    const d = Math.hypot(dx, dy);
    if (d <= step) return { x: tgt.x, y: tgt.y };
    const r = step / d;
    return { x: cur.x + dx * r, y: cur.y + dy * r };
  };

  const predictPos = (enemy, msAhead=0) => {
    if(!enemy) return null;
    const head = getHead(enemy);
    const v = enemy.velocity || { x:0,y:0,z:0 };
    return {
      x: head.x + v.x*(msAhead/1000),
      y: head.y + v.y*(msAhead/1000),
      z: (head.z||0) + (v.z||0)*(msAhead/1000)
    };
  };

  const predictHeadTurn = (enemy, msAhead = CONFIG.maxLeadMs) => {
    const head = getHead(enemy);
    if (!head) return null;
    const yaw = enemy.rotation?.yaw || 0;
    const pitch = enemy.rotation?.pitch || 0;
    const prevYaw = enemy.prevYaw ?? yaw;
    const prevPitch = enemy.prevPitch ?? pitch;
    enemy.prevYaw = yaw;
    enemy.prevPitch = pitch;
    const yawSpeed = (yaw - prevYaw) / (CONFIG.tickIntervalMs / 1000);
    const pitchSpeed = (pitch - prevPitch) / (CONFIG.tickIntervalMs / 1000);
    const fYaw = yaw + yawSpeed * (msAhead / 1000);
    const fPitch = pitch + pitchSpeed * (msAhead / 1000);
    const off = {
      x: Math.cos(fYaw) * 0.25,
      y: Math.sin(fYaw) * 0.25,
      z: Math.sin(fPitch) * 0.25
    };
    return { x: head.x + off.x, y: head.y + off.y, z: head.z + off.z };
  };

  const applyComp = enemy => {
    const h = getHead(enemy);
    if (!h) return null;
    const player = getPlayer();
    const d = dist(player, h);
    let leadMs = (d / CONFIG.projectileSpeed) * 1000 * CONFIG.overtrackLeadFactor;
    if (leadMs > CONFIG.maxLeadMs) leadMs = CONFIG.maxLeadMs;
    return predictPos(enemy, leadMs) || h;
  };

  const nearHead = (enemy, thr=CONFIG.crosshairNearThresholdPx) => {
    const h = getHead(enemy);
    const ch = crosshair();
    if(!h) return false;
    return Math.hypot(ch.x - h.x, ch.y - h.y) <= thr;
  };

  const instantAim = pos => { if(pos) setCrosshair(clampAimMove(crosshair(), pos, CONFIG.clampStepPx)); };

  const scoreTarget = enemy => {
    const player = getPlayer();
    const h = getHead(enemy);
    if(!h) return { score: -Infinity, dist: Infinity };
    let score = 10000 - dist(player, h) * 1.5;
    if(enemy.isAimingAtYou) score += 9999;
    if(enemy.health < 50) score += 500;
    if(!enemy.isVisible) score -= 2000;
    return { score, dist: dist(player, h) };
  };

  const chooseTarget = enemies => {
    let best = null, bestScore = -Infinity;
    for (const e of enemies) {
      const s = scoreTarget(e);
      if (s.score > bestScore) { bestScore = s.score; best = e; }
    }
    return best;
  };

  const willPeekSoon = e => {
    if (!e) return false;
    if (e.isAtCoverEdge || e.peekIntent) return true;
    const v = e.velocity || { x:0,y:0,z:0 };
    const sp = Math.hypot(v.x, v.y, v.z);
    if (sp < 0.15 && e.priorSpeed > 0.5) return true;
    return Math.random() < 0.15;
  };

  const engage = t => {
    if (!t) return;
    const h = getHead(t);
    if (!h) return;
    const player = getPlayer();
    const d = dist(player, h);
    const aimPos = predictHeadTurn(t, CONFIG.maxLeadMs) || applyComp(t) || h;

    if (d <= CONFIG.closeRangeMeters) {
      instantAim(aimPos);
      if (CONFIG.instantFireIfHeadLocked) fireNow();
      return;
    }

    if (d <= CONFIG.preFireRange && willPeekSoon(t)) {
      const pre = predictPos(t, CONFIG.preFireLeadMs) || aimPos;
      instantAim(pre);
      fireNow();
      return;
    }

    instantAim(aimPos);

    if (CONFIG.burstCompEnabled && game?.autoAdjustSpray) {
      game.autoAdjustSpray(aimPos, CONFIG.burstCompFactor);
    }

    if (nearHead(t)) fireNow();
  };

  const tick = () => {
    try {
      const enemies = getEnemies();
      if (!enemies.length) return;
      engage(chooseTarget(enemies));
    } catch {}
  };

  setInterval(tick, CONFIG.tickIntervalMs);
})();
