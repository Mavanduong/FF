// ==UserScript==
// @name         AutoHeadlockProMax v3.4 – Multi-Bullet Headlock, 5-Shot Buff
// @version      3.4
// @description  Ghim đầu đa viên, xuyên vật thể, buff 5 viên đầu, tính toán mọi góc bắn
// ==/UserScript==

(function () {
  try {
    if (!$response || !$response.body) return $done({});
    let body = $response.body;
    let data = JSON.parse(body);

    const HEAD_BONE = "head";
    const MAX_DISTANCE = 180;
    const PENETRATE_ZONE = 50;
    const BASE_LOCK_FORCE = 2.0;
    const HEAD_OFFSET_Y = 0.042;
    const FIRST_BURST_BUFF = 1.45; // buff 5 viên đầu
    const BURST_SHOTS = 5;

    const player = data.player || {};
    const aimVec = data.viewVector || { x: 0, y: 0, z: 1 };
    const currentWeapon = player.weapon || {};
    const isBurstWeapon = ["mp40", "m1014", "vector"].some(w =>
      currentWeapon.name?.toLowerCase().includes(w)
    );
    const currentBurst = player.shotsFired || 0;

    function distance(a, b) {
      const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    function directionSimilarity(a, b) {
      const magA = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
      const magB = Math.sqrt(b.x * b.x + b.y * b.y + b.z * b.z);
      const dot = (a.x * b.x + a.y * b.y + a.z * b.z) / (magA * magB + 0.0001);
      return dot;
    }

    function predict(pos, vel, time) {
      return {
        x: pos.x + vel.x * time,
        y: pos.y + vel.y * time,
        z: pos.z + vel.z * time,
      };
    }

    function isInLineOfSight(player, head, aim) {
      const toTarget = {
        x: head.x - player.x,
        y: head.y - player.y,
        z: head.z - player.z,
      };
      return directionSimilarity(toTarget, aim) > 0.96;
    }

    function forceLock(enemy, pos, multiplier = 1.0) {
      enemy.aimPosition = {
        x: pos.x,
        y: pos.y + HEAD_OFFSET_Y,
        z: pos.z,
      };
      enemy.lockSpeed = BASE_LOCK_FORCE * multiplier;
      enemy.stickiness = 2.0 * multiplier;
      enemy.smoothLock = false;
      enemy._internal_autoLock = true;
      enemy._internal_priority = 999999;

      ["autoLock", "aimHelp", "priority", "aimBot", "lockZone", "headLock"].forEach(k => delete enemy[k]);
    }

    let bestTarget = null;
    let bestScore = -Infinity;

    if (Array.isArray(data.targets)) {
      for (const e of data.targets) {
        const head = e?.bone?.[HEAD_BONE];
        if (!head) continue;

        const dist = distance(player, head);
        if (dist > MAX_DISTANCE) continue;

        const vel = e.velocity || { x: 0, y: 0, z: 0 };
        const timeToImpact = 1.2 * (dist / 100);
        const predictedHead = predict(head, vel, timeToImpact);
        const align = isInLineOfSight(player, predictedHead, aimVec);
        const squadLock = globalThis._squadLockTargetId === e.id;
        const canPenetrate = align && dist < PENETRATE_ZONE;

        if (!e.obstacleBetween || canPenetrate || squadLock) {
          let score = (1 / dist) * (e.isFiring ? 1.5 : 1.0) * (align ? 2 : 1);
          if (score > bestScore) {
            bestScore = score;
            bestTarget = { enemy: e, pos: predictedHead };
          }
        }
      }
    }

    if (bestTarget) {
      globalThis._squadLockTargetId = bestTarget.enemy.id;

      const isFirstBurst = isBurstWeapon && currentBurst < BURST_SHOTS;
      const buffMultiplier = isFirstBurst ? FIRST_BURST_BUFF : 1.0;

      forceLock(bestTarget.enemy, bestTarget.pos, buffMultiplier);
    } else {
      globalThis._squadLockTargetId = null;
    }

    $done({ body: JSON.stringify(data) });

  } catch (err) {
    $done({});
  }
})();
