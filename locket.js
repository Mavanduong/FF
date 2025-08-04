// ==UserScript==
// @name         AutoHeadlockProMax v3.4 – Ghim Dynamic + Ưu Tiên FOV + Giữ Mục Tiêu
// @version      3.4
// @description  Ghim đầu bất chấp vật thể, ưu tiên FOV, dynamic force, giữ mục tiêu cũ
// ==/UserScript==

(function () {
  try {
    if (!$response || !$response.body) return $done({});
    let body = $response.body;
    let data = JSON.parse(body);

    const HEAD_BONE = "head";
    const MAX_DISTANCE = 180;
    const PENETRATE_ZONE = 50;
    const BASE_FORCE = 2.2;
    const STICKY_FORCE = 2.0;
    const DEFAULT_VIEW = { x: 0, y: 0, z: 1 };

    const player = data.player || {};
    const viewVector = data.viewVector || DEFAULT_VIEW;
    const prevTargetId = globalThis._squadLockTargetId || null;

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

    function forceLock(enemy, pos, vel) {
      const speed = Math.sqrt(vel.x ** 2 + vel.y ** 2 + vel.z ** 2);
      const dynamicForce = BASE_FORCE + speed * 0.03;
      const dynamicOffsetY = 0.042; // có thể thay đổi theo weapon nếu muốn

      enemy.aimPosition = {
        x: pos.x,
        y: pos.y + dynamicOffsetY,
        z: pos.z
      };
      enemy.lockSpeed = dynamicForce;
      enemy.stickiness = STICKY_FORCE;
      enemy.smoothLock = false;
      enemy._internal_autoLock = true;
      enemy._internal_priority = 999999;

      ["autoLock", "aimHelp", "priority", "aimBot", "lockZone", "headLock"].forEach(k => delete enemy[k]);
    }

    // Ưu tiên giữ mục tiêu cũ nếu vẫn còn hợp lệ
    if (prevTargetId && Array.isArray(data.targets)) {
      const oldTarget = data.targets.find(t => t.id === prevTargetId);
      const head = oldTarget?.bone?.[HEAD_BONE];
      if (head) {
        const vel = oldTarget.velocity || { x: 0, y: 0, z: 0 };
        const dist = distance(player, head);
        if (dist <= MAX_DISTANCE) {
          const predicted = predict(head, vel, 1.2 * (dist / 100));
          forceLock(oldTarget, predicted, vel);
          return $done({ body: JSON.stringify(data) });
        }
      }
    }

    // Tìm mục tiêu mới
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
        const alignCheck = isInLineOfSight(player, predicted, viewVector);
        const canBypass = alignCheck && dist < PENETRATE_ZONE;
        const isValid = !e.obstacleBetween || canBypass || e.id === prevTargetId;

        if (isValid) {
          const fovBoost = directionSimilarity(
            {
              x: predicted.x - player.x,
              y: predicted.y - player.y,
              z: predicted.z - player.z
            },
            viewVector
          );

          const score =
            (1 / dist) *
            (e.isFiring ? 1.5 : 1.0) *
            (alignCheck ? 2 : 1) *
            (fovBoost + 0.1);

          if (score > bestScore) {
            bestScore = score;
            chosen = { enemy: e, pos: predicted, vel };
          }
        }
      }
    }

    if (chosen) {
      globalThis._squadLockTargetId = chosen.enemy.id;
      forceLock(chosen.enemy, chosen.pos, chosen.vel);
    } else {
      globalThis._squadLockTargetId = null;
    }

    $done({ body: JSON.stringify(data) });

  } catch (err) {
    $done({});
  }
})();
