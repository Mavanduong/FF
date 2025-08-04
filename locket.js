// ==UserScript==
// @name         AutoHeadlockProMax v3.4 – Burst Headlock + Wall Bypass
// @version      3.4
// @description  Ghim đầu 5 viên đầu tiên cực mạnh, hỗ trợ MP40/M1014/Vector, auto predict, xuyên vật thể
// ==/UserScript==

(function () {
  try {
    if (!$response || !$response.body) return $done({});
    let body = $response.body;
    let data = JSON.parse(body);

    const HEAD_BONE = "head";
    const MAX_DISTANCE = 200;
    const PENETRATE_ZONE = 50;
    const LOCK_FORCE = 2.8;
    const STICKY_FORCE = 2.4;
    const HEAD_Y_OFFSET = 0.042;
    const BULLET_SPREAD_ANGLE = 0.01;
    const BULLETS_TO_FORCE = 5;
    const TARGET_SCORE_BOOST = 3;

    const player = data.player || {};
    const aimVector = data.viewVector || { x: 0, y: 0, z: 1 };
    const squadTargetId = globalThis._squadLockTargetId || null;

    function distance(a, b) {
      const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    function directionSimilarity(a, b) {
      const magA = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
      const magB = Math.sqrt(b.x * b.x + b.y * b.y + b.z * b.z);
      return (a.x * b.x + a.y * b.y + a.z * b.z) / (magA * magB + 0.0001);
    }

    function predict(pos, vel, time) {
      return {
        x: pos.x + vel.x * time,
        y: pos.y + vel.y * time,
        z: pos.z + vel.z * time
      };
    }

    function isInSight(player, target, aim) {
      const toTarget = {
        x: target.x - player.x,
        y: target.y - player.y,
        z: target.z - player.z
      };
      return directionSimilarity(toTarget, aim) > 0.96;
    }

    function applyHeadlock(enemy, pos, bulletIndex = 0) {
      const spreadFactor = (bulletIndex < BULLETS_TO_FORCE) ? 1.0 : 0.8;
      const force = (bulletIndex < BULLETS_TO_FORCE) ? LOCK_FORCE : 1.6;
      const stick = (bulletIndex < BULLETS_TO_FORCE) ? STICKY_FORCE : 1.2;

      enemy.aimPosition = {
        x: pos.x,
        y: pos.y + HEAD_Y_OFFSET,
        z: pos.z
      };
      enemy.lockSpeed = force;
      enemy.stickiness = stick;
      enemy._internal_burstBoost = true;
      enemy._internal_priority = 999999 - bulletIndex;

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
        const alignOK = isInSight(player, predicted, aimVector);
        const canBypass = alignOK && dist < PENETRATE_ZONE;
        const valid = !e.obstacleBetween || canBypass || squadTargetId === e.id;

        if (valid) {
          const score =
            (1 / dist) *
            (e.isFiring ? 1.5 : 1) *
            (alignOK ? TARGET_SCORE_BOOST : 1) *
            (e.id === squadTargetId ? 2 : 1);

          if (score > bestScore) {
            bestScore = score;
            chosen = { enemy: e, pos: predicted };
          }
        }
      }
    }

    if (chosen) {
      globalThis._squadLockTargetId = chosen.enemy.id;

      // Multi-bullet compensation for burst weapons (MP40, M1014, Vector)
      for (let i = 0; i < BULLETS_TO_FORCE; i++) {
        applyHeadlock(chosen.enemy, chosen.pos, i);
      }
    } else {
      globalThis._squadLockTargetId = null;
    }

    $done({ body: JSON.stringify(data) });
  } catch (err) {
    $done({});
  }
})();
