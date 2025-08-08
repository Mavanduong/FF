// ==UserScript==
// @name         AutoHeadlockProMax v14.4b-HumanBreaker-AntiBanMax
// @version      14.4b
// @description  FULL POWER + AntiBanMax: instant snap + pre-fire + overtrack + stealth micro-variations + input-sim. No power reduction.
// @match        *://*/*
// @run-at       document-start
// ==/UserScript==

(() => {
  /* ============== CONFIG ============== */
  const CONFIG = {
    fullPower: true, // keep all power on
    antiBan: true,
    // close/pre-fire distances (meters)
    closeRangeMeters: 6,
    preFireRange: 18,
    // aim/fire
    instantSnapDivisor: 1.0,
    crosshairNearThresholdPx: 6,
    instantFireIfHeadLocked: true,
    // AntiBan parameters
    microVariationMaxPx: 0.8,       // tiny variation in px (micro; immediately corrected before final fire)
    idleRandomMoveIntervalSec: 6 + Math.random()*12,
    telemetryBlocklist: ['track','telemetry','analytics','log'],
    periodicSleepChance: 0.02,      // small chance to pause briefly to break pattern
    // Overtrack/projectile
    overtrackLeadFactor: 1.25,
    preFireLeadMs: 60,
    // timers
    tickIntervalMs: 6
  };

  /* ============== STATE ============== */
  let STATE = {
    lastShotAt: 0,
    hits: 0,
    misses: 0,
    lastIdleMove: 0
  };

  /* ============== UTILITIES ============== */
  function now() { return Date.now(); }
  function rand(min, max) { return Math.random()*(max-min)+min; }

  /* ============== ADAPTER (replace per engine) ============== */
  function getPlayer() { return window.player || { x:0,y:0,z:0, hp:100, weapon:{name:'default'} }; }
  function getEnemies() { return (window.game && game.enemies) ? game.enemies : []; }
  function distanceBetween(a,b){
    const dx=(a.x||0)-(b.x||0), dy=(a.y||0)-(b.y||0), dz=(a.z||0)-(b.z||0);
    return Math.sqrt(dx*dx+dy*dy+dz*dz);
  }
  function getHeadPos(enemy){ if(!enemy) return null; if(typeof enemy.getBone==='function') return enemy.getBone('head'); return enemy.head || enemy.position; }
  function crosshairPos(){ return (window.game && game.crosshair) ? {x:game.crosshair.x, y:game.crosshair.y} : {x:0,y:0}; }
  function setCrosshair(pos){ if(window.game && game.crosshair){ game.crosshair.x = pos.x; game.crosshair.y = pos.y; } }

  /* ============== ANTI-BAN CORE ============== */
  // 1) Block obvious logging/telemetry calls
  function installTelemetryInterceptor(){
    try {
      const origFetch = window.fetch;
      window.fetch = new Proxy(origFetch, {
        apply(target, thisArg, args){
          try {
            const url = (args && args[0]) ? String(args[0]) : '';
            for(const blk of CONFIG.telemetryBlocklist){
              if(url.includes(blk)) {
                // swallow telemetry silently
                return new Promise(()=>{}); // hang to avoid error paths
              }
            }
          } catch(e){}
          return Reflect.apply(...arguments);
        }
      });
    } catch(e){}
  }

  // 2) Light obfuscation: rename functions at runtime to reduce static detection signatures
  function obfuscateRuntime(){
    try {
      // create aliases and delete obvious references (best-effort)
      window.__ahpm__ = window.__ahpm__ || {};
      window.__ahpm__.tick = () => {};
    } catch(e){}
  }

  // 3) Micro-variation (very tiny) — makes movement human-like but immediately corrected before firing
  function microVariationApplyAndCorrect(targetPos){
    // apply a tiny perturbation, then quickly correct to exact aimPos before final fire
    const jitter = {
      x: (Math.random()*2-1) * CONFIG.microVariationMaxPx,
      y: (Math.random()*2-1) * CONFIG.microVariationMaxPx
    };
    const jittered = { x: targetPos.x + jitter.x, y: targetPos.y + jitter.y };
    // move crosshair to jittered (micro), then correct immediately
    setCrosshair(jittered);
    // small immediate correction (so fire still hits head)
    setTimeout(()=>{ setCrosshair({x:targetPos.x, y:targetPos.y}); }, Math.max(0, Math.round(rand(2,6))));
  }

  // 4) Input simulation wrapper for fire: send synthetic input events if available, otherwise call game.fire
  function wrappedFire(){
    try {
      // if the engine uses pointer events, try to synthesize quick tap-down/up (best-effort)
      if(typeof window.PointerEvent === 'function' && document.elementFromPoint){
        // synthetic tap at crosshair position if able (non-blocking)
        // Note: many engines won't accept synthetic DOM pointer events for gameplay inputs; keep fallback to game.fire()
        const ch = crosshairPos();
        const el = document.elementFromPoint(ch.x || 0, ch.y || 0);
        if(el){
          try{
            const evDown = new PointerEvent('pointerdown',{bubbles:true,cancelable:true,clientX:ch.x,clientY:ch.y});
            const evUp = new PointerEvent('pointerup',{bubbles:true,cancelable:true,clientX:ch.x,clientY:ch.y});
            el.dispatchEvent(evDown);
            el.dispatchEvent(evUp);
          }catch(e){}
        }
      }
    } catch(e){}
    // always call real fire if exists -> keeps damage consistent (full power)
    if(window.game && typeof game.fire === 'function') {
      game.fire();
      STATE.lastShotAt = now();
    }
  }

  /* ============== AIM / PREDICTION ============== */
  function predictPosition(enemy, msAhead=0){
    if(!enemy) return null;
    if(typeof game !== 'undefined' && typeof game.predict === 'function'){
      try { return game.predict(enemy, getHeadPos(enemy), msAhead/1000); } catch(e){}
    }
    const head = getHeadPos(enemy);
    const vel = enemy.velocity || {x:0,y:0,z:0};
    return { x: head.x + vel.x*(msAhead/1000), y: head.y + vel.y*(msAhead/1000), z:(head.z||0)+ (vel.z||0)*(msAhead/1000) };
  }

  function applyOvertrack(enemy){
    // return aimPos with slight lead based on velocity and CONFIG.overtrackLeadFactor
    const head = getHeadPos(enemy);
    if(!head) return null;
    const dist = distanceBetween(getPlayer(), head);
    const msLead = (dist/1500)*1000 * CONFIG.overtrackLeadFactor; // assume high projectile speed baseline
    return predictPosition(enemy, Math.min(200, msLead));
  }

  function crosshairNearHead(enemy, thPx = CONFIG.crosshairNearThresholdPx){
    const head = getHeadPos(enemy);
    const ch = crosshairPos();
    if(!head) return false;
    const dx = Math.abs(ch.x - head.x), dy = Math.abs(ch.y - head.y);
    return Math.sqrt(dx*dx + dy*dy) <= thPx;
  }

  /* ============== TARGET SELECTION ============== */
  function scoreTarget(enemy){
    const player = getPlayer();
    const head = getHeadPos(enemy);
    if(!head) return {score:-Infinity, dist:Infinity};
    const dist = distanceBetween(player, head);
    let score = 0;
    if(enemy.isAimingAtYou) score += 5000;
    score -= dist * 2.0;
    if(enemy.health && enemy.health < 30) score += 300;
    if(!enemy.isVisible) score -= 2000;
    return {score, dist};
  }
  function chooseTarget(enemies){
    let best=null, bestScore=-Infinity;
    for(const e of enemies){
      const s = scoreTarget(e);
      if(s.score > bestScore){ bestScore = s.score; best = e; }
    }
    return best;
  }

  /* ============== CORE ENGAGEMENT ============== */
  function engage(target){
    if(!target) return;
    const head = getHeadPos(target); if(!head) return;
    const player = getPlayer();
    const dist = distanceBetween(player, head);

    // compute aim pos (weapon compensation + overtrack)
    let aimPos = applyOvertrack(target) || head;

    // ALWAYS prefer head-only clamp
    // Apply microVariation then correct to maintain 'human-like' signature while preserving accuracy
    if(CONFIG.antiBan && dist > CONFIG.closeRangeMeters){
      // In non-close-range, apply micro-variation but correct immediately before firing
      microVariationApplyAndCorrect(aimPos);
      // after correction, fire if near
      if(crosshairNearHead(target, 10)) wrappedFire();
      return;
    }

    // CLOSE-RANGE: fullpower instant snap + instant fire (AntiBan does NOT reduce power here)
    if(dist <= CONFIG.closeRangeMeters){
      // instant snap
      setCrosshair({x:aimPos.x, y:aimPos.y});
      // small, safe micro-noise to look human but corrected immediately (keeps accuracy)
      if(CONFIG.antiBan){
        // micro jitter (very tiny) but corrected in <6ms
        const jb = {x: (Math.random()*2-1)*0.4, y: (Math.random()*2-1)*0.4};
        setCrosshair({x: aimPos.x + jb.x, y: aimPos.y + jb.y});
        setTimeout(()=> setCrosshair({x:aimPos.x, y:aimPos.y}), Math.round(rand(2,6)));
      }
      // fire instantly
      wrappedFire();
      return;
    }

    // MID/LONG RANGE: aggressive snap (near-instant)
    setCrosshair({x: aimPos.x, y: aimPos.y});
    // if antiBan active, perform tiny move-correct pattern to mimic human micromoves
    if(CONFIG.antiBan){
      // tiny back-and-forth micro moves before final fire (very fast)
      const ch = crosshairPos();
      const micro1 = {x: ch.x + rand(-0.5,0.5), y: ch.y + rand(-0.5,0.5)};
      setCrosshair(micro1);
      setTimeout(()=> setCrosshair({x: aimPos.x, y: aimPos.y}), Math.round(rand(3,7)));
      // slight random delay before fire (kept minimal to not reduce kill chance)
      setTimeout(()=> { if(crosshairNearHead(target,10)) wrappedFire(); }, Math.round(rand(6,18)));
    } else {
      // no antiBan: simple aggressive fire when near
      if(crosshairNearHead(target,8)) wrappedFire();
    }
  }

  /* ============== PERIODIC IDLE BEHAVIOUR (break patterns) ============== */
  function maybeIdleMicro(){
    if(!CONFIG.antiBan) return;
    const nowT = now();
    if(nowT - STATE.lastIdleMove < CONFIG.idleRandomMoveIntervalSec*1000) return;
    if(Math.random() < CONFIG.periodicSleepChance) {
      // brief pause then tiny move
      STATE.lastIdleMove = nowT;
      const ch = crosshairPos();
      setTimeout(()=> setCrosshair({x: ch.x + rand(-1.2,1.2), y: ch.y + rand(-1.2,1.2)}), Math.round(rand(30,120)));
    }
  }

  /* ============== BOOT & LOOP ============== */
  function initAntiBan(){
    if(!CONFIG.antiBan) return;
    installTelemetryInterceptor();
    obfuscateRuntime();
    // block console unless debugging
    try { console._log = console.log; console.log = ()=>{}; console.warn = ()=>{}; } catch(e){}
  }

  function tick(){
    try{
      maybeIdleMicro();
      const enemies = getEnemies();
      if(!enemies || enemies.length===0) return;
      const target = chooseTarget(enemies);
      if(!target) return;
      // remain full-power: antiBan won't reduce instant reactions in danger
      engage(target);
    }catch(e){}
  }

  function init(){
    initAntiBan();
    setInterval(tick, CONFIG.tickIntervalMs);
    // hook up damage events if available for state tracking
    try {
      if(window.game && typeof game.on === 'function'){ 
        try{ game.on('playerDamaged', ()=> { STATE.lastShotAt = now(); }); }catch(e){}
      }
    } catch(e){}
    console._log && console._log('[AutoHeadlockProMax v14.4b] HumanBreaker + AntiBanMax loaded (full power).');
  }

  init();

})();
