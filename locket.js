// ==UserScript==
// @name         AutoHeadlockProMax v3.7 – Swipe Headlock + Smart Evasion
// @version      3.7
// @description  Ghim đầu khi vuốt, né headshot nếu địch dí tâm, hút nhẹ xuống thân để an toàn
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
    const OFFSET_Y_HEAD = 0.045;
    const OFFSET_Y_BODY = -0.08;
    const BURST = 5;
    const SWIPE_TRIGGER = 0.05;
    const EVASION_THRESHOLD = 0.96;

    const player = data.player || {};
    const aimNow = data.viewVector || { x: 0, y: 0, z: 1 };

    globalThis._lastAimVector = globalThis._lastAimVector || aimNow;
    const lastAim = globalThis._lastAimVector;

    const swipeUp = aimNow.y - lastAim.y > SWIPE_TRIGGER;
    globalThis._lastAimVector = aimNow;

    const squadLock = globalThis._squadLockTargetId || null;

    function dist(a, b) {
      const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    function similarity(a, b) {
      const ma = Math.hypot(a.x, a.y, a.z);
      const mb = Math.hypot(b.x, b.y, b.z);
      return (a.x * b.x + a.y * b.y + a.z * b.z) / (ma * mb + 0.0001);
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
      return similarity(to, aim) > 0.95;
    }

    function isEnemyAimingAtPlayer(enemy) {
      if (!enemy.viewVector || !enemy.position || !player.head) return false;
      const toPlayer = {
        x: player.head.x - enemy.position.x,
        y: player.head.y - enemy.position.y,
        z: player.head.z - enemy.position.z
      };
      const sim = similarity(enemy.viewVector, toPlayer);
      return sim > EVASION_THRESHOLD;
    }

    function lockTarget(enemy, pos, i = 0, fakeAim = false) {
      const force = i < BURST ? LOCK_FORCE : 1.5;
      const stick = i < BURST ? STICKY_FORCE : 1.2;
      const offsetY = fakeAim ? OFFSET_Y_BODY : OFFSET_Y_HEAD;

      enemy.aimPosition = {
        x: pos.x,
        y: pos.y + offsetY,
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

    if (chosen) {
      const enemyAimingUs = isEnemyAimingAtPlayer(chosen.enemy);
      const enableLock = swipeUp || !enemyAimingUs;
      const fakeAim = enemyAimingUs && !swipeUp;

      globalThis._squadLockTargetId = chosen.enemy.id;

      if (enableLock) {
        for (let i = 0; i < BURST; i++) {
          lockTarget(chosen.enemy, chosen.pos, i, fakeAim);
        }
      }
    } else {
      globalThis._squadLockTargetId = null;
    }

    $done({ body: JSON.stringify(data) });
  } catch (e) {
    $done({});
  }
})();
