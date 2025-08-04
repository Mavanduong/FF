// ==UserScript==
// @name         AutoHeadlockProMax v3.3 – Ghim Xuyên Vật Thể
// @version      3.3
// @description  Ghim đầu bất chấp vật thể, nếu tâm hướng gần đúng
// ==/UserScript==

(function () {
  try {
    if (!$response || !$response.body) return $done({});
    let body = $response.body;
    let data = JSON.parse(body);

    const HEAD_BONE = "head";
    const MAX_DISTANCE = 180;
    const PENETRATE_ZONE = 50; // cho xuyên nếu dưới 50m
    const LOCK_FORCE = 2.2;
    const STICKY_FORCE = 2.0;
    const HEAD_OFFSET_Y = 0.042;

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

    function predict(pos, vel, time) {
      return {
        x: pos.x + vel.x * time,
        y: pos.y + vel.y * time,
        z: pos.z + vel.z * time
      };
    }

    function isInLineOfSight(player, head, aim) {
      const toTarget = {
        x: head.x - player.x,
        y: head.y - player.y,
        z: head.z - player.z
      };
      return directionSimilarity(toTarget, aim) > 0.96;
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

    let chosen = null;
    let bestScore = -Infinity;

    if (Array.isArray(data.targets)) {
      for (const e of data.targets) {
        const head = e?.bone?.[HEAD_BONE];
        if (!head) continue;

        const vel = e.velocity || { x: 0, y: 0, z: 0 };
        const dist = distance(player, head);
        if (dist > MAX_DISTANCE) continue;

        const predictTime = 1.2 * (dist / 100);
        const predicted = predict(head, vel, predictTime);

        const alignCheck = isInLineOfSight(player, predicted, data.viewVector || {x:0,y:0,z:1});

        const canBypass = alignCheck && dist < PENETRATE_ZONE;

        const isTargetValid = !e.obstacleBetween || canBypass || squadTargetId === e.id;

        if (isTargetValid) {
          const score = (1 / dist) * (e.isFiring ? 1.5 : 1.0) * (alignCheck ? 2 : 1);
          if (score > bestScore) {
            bestScore = score;
            chosen = { enemy: e, pos: predicted };
          }
        }
      }
    }

    if (chosen) {
      globalThis._squadLockTargetId = chosen.enemy.id;
      forceLock(chosen.enemy, chosen.pos);
    } else {
      globalThis._squadLockTargetId = null;
    }

    $done({ body: JSON.stringify(data) });

  } catch (err) {
    $done({});
  }
})();

