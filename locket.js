// ==UserScript==
// @name         AutoHeadlockProMax v3.4 – Ghim Đầu Tối Đa
// @version      3.4
// @description  Ghim đầu đa tia, xuyên vật thể, mọi góc, dự đoán chuyển động cực mạnh
// ==/UserScript==

(function () {
  try {
    if (!$response || !$response.body) return $done({});
    let body = $response.body;
    let data = JSON.parse(body);

    const HEAD_BONE = "head";
    const MAX_LOCK_DISTANCE = 180;
    const PENETRATE_ZONE = 50; // cho xuyên nếu dưới 50m
    const LOCK_FORCE = 2.6;
    const STICKY_FORCE = 2.4;
    const HEAD_OFFSET_Y = 0.042;
    const MULTI_SHOT_SPREAD = 3; // số tia tối đa
    const FIRE_DELAY = 0.12; // delay giữa các tia

    const player = data.player || {};
    const squadTargetId = globalThis._squadLockTargetId || null;

    function distance(a, b) {
      const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    function directionSimilarity(a, b) {
      const magA = Math.sqrt(a.x*a.x + a.y*a.y + a.z*a.z);
      const magB = Math.sqrt(b.x*b.x + b.y*b.y + b.z*b.z);
      const dot = (a.x*b.x + a.y*b.y + a.z*b.z) / (magA * magB + 0.0001);
      return dot;
    }

    function predict(pos, vel, t) {
      return {
        x: pos.x + vel.x * t,
        y: pos.y + vel.y * t,
        z: pos.z + vel.z * t
      };
    }

    function isInLineOfSight(player, head, view) {
      const toTarget = {
        x: head.x - player.x,
        y: head.y - player.y,
        z: head.z - player.z
      };
      return directionSimilarity(toTarget, view) > 0.96;
    }

    function forceLock(enemy, pos) {
      enemy.aimPosition = {
        x: pos.x,
        y: pos.y + HEAD_OFFSET_Y,
        z: pos.z
      };
      enemy.lockSpeed = LOCK_FORCE;
      enemy.stickiness = STICKY_FORCE;
      enemy.smoothLock = false;
      enemy._internal_autoLock = true;
      enemy._internal_priority = 999999;

      ["autoLock", "aimHelp", "priority", "aimBot", "lockZone", "headLock"].forEach(k => delete enemy[k]);
    }

    let best = null;
    let bestScore = -Infinity;

    if (Array.isArray(data.targets)) {
      for (const e of data.targets) {
        const head = e?.bone?.[HEAD_BONE];
        if (!head) continue;

        const velocity = e.velocity || { x: 0, y: 0, z: 0 };
        const dist = distance(player, head);
        if (dist > MAX_LOCK_DISTANCE) continue;

        const predictTime = 1.2 * (dist / 100);
        const fireOffsets = Array.from({ length: MULTI_SHOT_SPREAD }, (_, i) => i * FIRE_DELAY);

        let finalPos = null;
        let canLock = false;

        for (const offset of fireOffsets) {
          const predictPos = predict(head, velocity, predictTime + offset);
          const align = isInLineOfSight(player, predictPos, data.viewVector || { x: 0, y: 0, z: 1 });
          const bypass = align && dist < PENETRATE_ZONE;
          const valid = !e.obstacleBetween || bypass || squadTargetId === e.id;

          if (valid) {
            const score = (1 / dist) * (e.isFiring ? 2 : 1) * (align ? 2 : 1);
            if (score > bestScore) {
              bestScore = score;
              best = { enemy: e, pos: predictPos };
              finalPos = predictPos;
              canLock = true;
            }
          }
        }

        if (canLock && best) {
          globalThis._squadLockTargetId = best.enemy.id;
          forceLock(best.enemy, finalPos);
        }
      }
    }

    if (!best) {
      globalThis._squadLockTargetId = null;
    }

    $done({ body: JSON.stringify(data) });
  } catch (e) {
    $done({});
  }
})();
