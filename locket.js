// ==UserScript==
// @name         AutoHeadlockProMax v3.5 – Ultra Fast Lock Mode
// @version      3.5
// @description  Lock siêu tốc ghim đầu 5 viên đầu tiên, cực chuẩn, hỗ trợ MP40/M1014/Vector
// ==/UserScript==

(function () {
  try {
    if (!$response || !$response.body) return $done({});
    let body = $response.body;
    let data = JSON.parse(body);

    const HEAD = "head";
    const MAX_DIST = 200;
    const PEN_ZONE = 50;
    const LOCK_FORCE = 3.2;
    const STICKY = 2.8;
    const OFFSET_Y = 0.043;
    const BURST_COUNT = 5;
    const TARGET_BOOST = 3;

    const player = data.player || {};
    const aim = data.viewVector || { x: 0, y: 0, z: 1 };
    const squadLock = globalThis._squadLockTargetId || null;

    function dist(a, b) {
      const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
      return Math.sqrt(dx*dx + dy*dy + dz*dz);
    }

    function similarity(a, b) {
      const ma = Math.hypot(a.x, a.y, a.z);
      const mb = Math.hypot(b.x, b.y, b.z);
      return (a.x*b.x + a.y*b.y + a.z*b.z) / (ma * mb + 0.0001);
    }

    function predict(pos, vel, t) {
      return {
        x: pos.x + vel.x * t,
        y: pos.y + vel.y * t,
        z: pos.z + vel.z * t
      };
    }

    function inSight(p, tgt, aim) {
      const to = { x: tgt.x - p.x, y: tgt.y - p.y, z: tgt.z - p.z };
      return similarity(to, aim) > 0.96;
    }

    function hardLock(enemy, pos, i = 0) {
      const f = i < BURST_COUNT ? LOCK_FORCE : 1.5;
      const s = i < BURST_COUNT ? STICKY : 1.0;
      enemy.aimPosition = { x: pos.x, y: pos.y + OFFSET_Y, z: pos.z };
      enemy.lockSpeed = f;
      enemy.stickiness = s;
      enemy._internal_burst = true;
      enemy._internal_priority = 999999 - i;

      ["autoLock", "aimHelp", "priority", "aimBot", "lockZone", "headLock"].forEach(k => delete enemy[k]);
    }

    let best = null;
    let bestScore = -999;

    if (Array.isArray(data.targets)) {
      for (const e of data.targets) {
        const head = e?.bone?.[HEAD];
        if (!head) continue;

        const vel = e.velocity || { x: 0, y: 0, z: 0 };
        const d = dist(player, head);
        if (d > MAX_DIST) continue;

        const t = d / 100;
        const pred = predict(head, vel, t);
        const see = inSight(player, pred, aim);
        const bypass = see && d < PEN_ZONE;
        const valid = !e.obstacleBetween || bypass || e.id === squadLock;

        if (!valid) continue;

        const score =
          (1 / d) *
          (e.isFiring ? 1.8 : 1) *
          (see ? TARGET_BOOST : 1) *
          (e.id === squadLock ? 2 : 1);

        if (score > bestScore) {
          bestScore = score;
          best = { enemy: e, pos: pred };
        }
      }
    }

    if (best) {
      globalThis._squadLockTargetId = best.enemy.id;

      // Ghim 5 viên ngay lập tức
      for (let i = 0; i < BURST_COUNT; i++) {
        hardLock(best.enemy, best.pos, i);
      }
    } else {
      globalThis._squadLockTargetId = null;
    }

    $done({ body: JSON.stringify(data) });
  } catch (e) {
    $done({});
  }
})();
