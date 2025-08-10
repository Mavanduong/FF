// ==UserScript==
// @name         AutoHeadlockProMax v16.0-UltimateAntiAssistX
// @version      16.0-UAA-X
// @description  Headlock ảo tuyệt đối, bỏ hẳn body lock, phá aim assist địch cực mạnh
// @match        *://*/*
// @run-at       document-start
// ==/UserScript==

(() => {
  const CONFIG = {
    tickIntervalMs: 1,
    crosshairNearThresholdPx: 99999,     // Lock xa vô hạn
    clampStepPx: 0.5,                    // Mượt siêu nhỏ
    maxLeadMs: 500,
    instantFireIfHeadLocked: true,
    smoothingFactor: 1.0,
    shakeAmplitudePx: 3.5,               // Shake mạnh hơn
    headOffsetY: -0.2,
    missBodyOffsetY: 0.5,                // Lệch xuống thân khi không headlock
    antiAssistRandomRange: 0.15           // Lệch phá aim assist cực mạnh
  };

  let STATE = {
    lastShotAt: 0,
    smoothPos: null,
    calibrationOffset: { x: 0, y: 0 }
  };

  const now = () => performance.now();
  const getPlayer = () => window.player || { x:0,y:0,z:0, weapon:{name:'default'} };
  const getEnemies = () => (window.game && game.enemies) ? game.enemies : [];

  const getBonePos = (enemy, bone) => (enemy?.getBone?.(bone) || enemy?.[bone] || enemy?.position);
  const getHeadPos = enemy => getBonePos(enemy, 'head');
  const crosshairPos = () => STATE.smoothPos || (game?.crosshair ? {x:game.crosshair.x, y:game.crosshair.y} : {x:0,y:0});
  const setCrosshair = pos => { if(game?.crosshair){ game.crosshair.x=pos.x; game.crosshair.y=pos.y; } STATE.smoothPos = pos; };

  const fireNow = () => { if(game?.fire){ game.fire(); STATE.lastShotAt = now(); } };
  const lerp = (a,b,t) => a + (b-a)*t;
  const clampAimMove = (cur,target) => {
    const dx=target.x-cur.x, dy=target.y-cur.y, dist=Math.sqrt(dx*dx+dy*dy);
    if(dist <= CONFIG.clampStepPx) return target;
    const ratio = CONFIG.clampStepPx / dist;
    return {x:cur.x+dx*ratio, y:cur.y+dy*ratio};
  };

  const applyShake = pos => ({ x: pos.x + Math.sin(now()/60)*CONFIG.shakeAmplitudePx,
                               y: pos.y + Math.cos(now()/75)*CONFIG.shakeAmplitudePx });
  const applyAntiAssist = pos => {
    const r = () => (Math.random()-0.5)*2*CONFIG.antiAssistRandomRange;
    return { x: pos.x + r(), y: pos.y + r() };
  };

  const predictHead = enemy => {
    const head = getHeadPos(enemy);
    if(!head) return null;
    const vel = enemy.velocity || {x:0,y:0,z:0};
    return { x: head.x + vel.x*(CONFIG.maxLeadMs/1000) + STATE.calibrationOffset.x,
             y: head.y + vel.y*(CONFIG.maxLeadMs/1000) + STATE.calibrationOffset.y + CONFIG.headOffsetY };
  };

  const chooseTarget = enemies => {
    let best=null, bestScore=-Infinity;
    for(const e of enemies){
      const head = getHeadPos(e);
      if(!head) continue;
      const score = 999999 - Math.sqrt((head.x-getPlayer().x)**2+(head.y-getPlayer().y)**2);
      if(score>bestScore){ bestScore=score; best=e; }
    }
    return best;
  };

  const engageTarget = target => {
    let aimPos = predictHead(target);

    if(!aimPos){ // Không có đầu → lệch xuống phá aim assist
      const base = getBonePos(target,'chest') || getBonePos(target,'spine');
      if(base){
        aimPos = { x: base.x, y: base.y + CONFIG.missBodyOffsetY };
      }
    }

    aimPos = applyAntiAssist(applyShake(aimPos));
    const nextPos = clampAimMove(crosshairPos(), aimPos);
    setCrosshair(nextPos);

    if(CONFIG.instantFireIfHeadLocked && getHeadPos(target)){
      const dx = nextPos.x - getHeadPos(target).x;
      const dy = nextPos.y - getHeadPos(target).y;
      if(Math.sqrt(dx*dx+dy*dy) <= CONFIG.crosshairNearThresholdPx) fireNow();
    }
  };

  const tick = () => {
    const enemies = getEnemies();
    if(!enemies.length) return;
    const target = chooseTarget(enemies);
    if(!target) return;
    engageTarget(target);
  };

  setInterval(tick, CONFIG.tickIntervalMs);
  
})();
