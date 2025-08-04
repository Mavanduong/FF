// ==UserScript==
// @name         AutoHeadlockProMax v3.22 - Ghim Đầu Cực Mạnh
// @version      3.22
// @description  Lock đầu tuyệt đối, không trượt, không sway, ghim như keo
// ==/UserScript==

(function () {
  try {
    if (!$response || !$response.body) return $done({});
    let body = $response.body;
    let data = JSON.parse(body);

    const HEAD_BONE = "head";
    const MAX_DISTANCE = 180;
    const SUPER_PRIORITY = 999999;
    const ULTRA_LOCK_SPEED = 2.0;
    const ULTRA_STICKINESS = 2.0;
    const HEAD_OFFSET_Y = 0.045;
    const BASE_PREDICTION_TIME = 1.5;

    const player = data.player || {};
    const squadTargetId = globalThis._squadLockTargetId || null;

    function dist(a, b) {
      const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    function predict(pos, velocity, t) {
      return {
        x: pos.x + velocity.x * t,
        y: pos.y + velocity.y * t,
        z: pos.z + velocity.z * t
      };
    }

    function applyUltraLock(enemy, headPos) {
      enemy.aimPosition = {
        x: headPos.x,
        y: headPos.y + HEAD_OFFSET_Y,
        z: headPos.z
      };
      enemy.lockSpeed = ULTRA_LOCK_SPEED;
      enemy.stickiness = ULTRA_STICKINESS;
      enemy.smoothLock = false;
      enemy._internal_autoLock = true;
      enemy._internal_priority = SUPER_PRIORITY;

      [
        "autoLock", "aimHelp", "priority", "headLock",
        "aimBot", "lockZone", "debugAim"
      ].forEach(k => delete enemy[k]);
    }

    let chosen = null;
    let maxScore = -Infinity;

    if (Array.isArray(data.targets)) {
      for (const e of data.targets) {
        if (!e?.bone?.[HEAD_BONE] || e.obstacleBetween) continue;
        const head = e.bone[HEAD_BONE];
        const velocity = e.velocity || { x: 0, y: 0, z: 0 };
        const d = dist(player, head);
        if (d > MAX_DISTANCE) continue;

        const t = BASE_PREDICTION_TIME * (d / 100);
        const pred = predict(head, velocity, t);

        const score = (1 / d) * (e.aimingAt === player.id ? 2.0 : 1.0) * (e.isFiring ? 1.3 : 1.0);
        if (
          (!squadTargetId && score > maxScore) ||
          (squadTargetId && e.id === squadTargetId)
        ) {
          maxScore = score;
          chosen = { enemy: e, pos: pred };
        }
      }
    }

    if (chosen) {
      globalThis._squadLockTargetId = chosen.enemy.id;
      applyUltraLock(chosen.enemy, chosen.pos);
    } else {
      globalThis._squadLockTargetId = null;
    }

    $done({ body: JSON.stringify(data) });

  } catch (err) {
    $done({});
  }
})();
