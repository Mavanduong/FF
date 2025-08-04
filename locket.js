// ==UserScript==
// @name         AutoHeadlockProMax v3.6 – Swipe Head Assist
// @version      3.6
// @description  Hỗ trợ vuốt nhẹ/mạnh đều ghim đầu chính xác. Tự nhận swipe lên, auto ghim đầu cực nhanh
// ==/UserScript==

(function () {
  try {
    if (!$response || !$response.body) return $done({});
    let body = $response.body;
    let data = JSON.parse(body);

    const HEAD = "head";
    const MAX_DIST = 200;
    const PEN_ZONE = 50;
    const LOCK_FORCE = 3.5;
    const STICKY_FORCE = 3.0;
    const OFFSET_Y = 0.045;
    const BURST = 5;
    const SWIPE_ANGLE_TRIGGER = 0.05;

    const player = data.player || {};
    const aimNow = data.viewVector || { x: 0, y: 0, z: 1 };

    // Lưu hướng aim của frame trước
    globalThis._lastAimVector = globalThis._lastAimVector || aimNow;
    const lastAim = globalThis._lastAimVector;

    // Kiểm tra có đang vuốt lên không
    const swipeUp = aimNow.y - lastAim.y > SWIPE_ANGLE_TRIGGER;
    globalThis._lastAimVector = aimNow;

    const squadLock = globalThis._squadLockTargetId || null;

    function dist(a, b) {
      const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
      return Math.sqrt(dx*dx + dy*dy + dz*dz);
    }

    function predict(pos, vel, t) {
      return {
        x: pos.x + vel.x * t,
        y: pos.y + vel.y * t,
        z: pos.z + vel.z * t
      };
    }

    function similarity(a, b) {
      const ma = Math.hypot(a.x, a.y, a.z);
      const mb = Math.hypot(b.x, b.y, b.z);
      return (a.x*b.x + a.y*b.y + a.z*b.z) / (ma * mb + 0.0001);
    }

    function inSight(p, tgt, aim) {
      const to = { x: tgt.x - p.x, y: tgt.y - p.y, z: tgt.z - p.z };
      return similarity(to, aim) > 0.95;
    }

    function lockHead(enemy, pos, i = 0) {
      const force = i < BURST ? LOCK_FORCE : 1.6;
      const stick = i < BURST ? STICKY_FORCE : 1.2;

      enemy.aimPosition = {
        x: pos.x,
        y: pos.y + OFFSET_Y,
        z: pos.z
      };
      enemy.lockSpeed = force;
      enemy.stickiness = stick;
      enemy._internal_priority = 99999 - i;

      ["autoLock", "aimHelp", "priority", "aimBot", "headLock"].forEach(k => delete enemy[k]);
    }

    let chosen = null;
    let bestScore = -Infinity;

    if (Array.isArray(data.targets)) {
      for (const e of data.targets) {
        const head = e?.bone?.[HEAD];
        if (!head) continue;

        const vel = e.velocity || { x: 0, y: 0, z: 0 };
        const d = dist(player, head);
        if (d > MAX_DIST) continue;

        const t = d / 100;
        const pred = predict(head, vel, t);
        const align = inSight(player, pred, aimNow);
        const bypass = align && d < PEN_ZONE;
        const valid = !e.obstacleBetween || bypass || e.id === squadLock;

        if (!valid) continue;

        const score =
          (1 / d) *
          (e.isFiring ? 1.8 : 1) *
          (align ? 3 : 1) *
          (e.id === squadLock ? 2 : 1);

        if (score > bestScore) {
          bestScore = score;
          chosen = { enemy: e, pos: pred };
        }
      }
    }

    if (chosen && swipeUp) {
      globalThis._squadLockTargetId = chosen.enemy.id;

      for (let i = 0; i < BURST; i++) {
        lockHead(chosen.enemy, chosen.pos, i);
      }
    } else {
      globalThis._squadLockTargetId = null;
    }

    $done({ body: JSON.stringify(data) });
  } catch (e) {
    $done({});
  }
})();
