// ==UserScript==
// @name         AutoHeadlockProMax v3.21 Final
// @version      3.21
// @description  Ghim 100% đầu bất chấp: jump, chạy, obstacle, sway, vuốt dài lock mạnh
// ==/UserScript==

(function () {
  try {
    if (!$response || !$response.body) return $done({});
    let data = JSON.parse($response.body);

    const HEAD = "head", MAX_DIST = 180, BASE_FOV = 55, AIM_POWER = 1.2;
    const HEAD_Y_OFFSET = 0.04, NECK_Y_OFFSET = -0.08;
    const SWAY_MAGNITUDE = 0.015;
    const player = data.player;
    const fov = BASE_FOV / (player.scopeZoom || 1);
    const swipe = player.lastSwipeTime && Date.now() - player.lastSwipeTime < 400;
    const squadLockId = globalThis._squadTargetId || null;

    const calcDist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);

    function inFOV(target, player, maxFOV = fov) {
      const dx = target.x - player.x, dy = target.y - player.y, dz = target.z - player.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const forward = player.direction || { x: 0, y: 0, z: 1 };
      const dot = (dx * forward.x + dy * forward.y + dz * forward.z) / dist;
      const angle = Math.acos(dot) * (180 / Math.PI);
      return angle < maxFOV;
    }

    function applyLock(enemy, head, dist, isSwipe) {
      const offsetY = isSwipe ? HEAD_Y_OFFSET : NECK_Y_OFFSET;
      const swayX = (Math.random() - 0.5) * SWAY_MAGNITUDE * 2;
      const swayY = (Math.random() - 0.5) * SWAY_MAGNITUDE * 2;
      const swayZ = (Math.random() - 0.5) * SWAY_MAGNITUDE * 2;
      const distanceFactor = dist < 40 ? 1.2 : dist < 80 ? 1.0 : 0.85;
      const lockIntensity = swipe ? 1.3 : 0.95;

      enemy.aimPosition = {
        x: head.x + swayX,
        y: head.y + offsetY + swayY,
        z: head.z + swayZ
      };
      enemy.lockSpeed = AIM_POWER * distanceFactor;
      enemy.stickiness = lockIntensity;
      enemy._internal_autoLock = true;
      enemy._internal_priority = 999;
      enemy.smoothLock = false;

      ["autoLock", "aimBot", "priority", "lockZone", "debugAim"].forEach(k => delete enemy[k]);
    }

    let best = null, bestScore = 0;

    if (Array.isArray(data.targets)) {
      for (let t of data.targets) {
        if (!t?.bone?.[HEAD]) continue;

        const h = t.bone[HEAD], v = t.velocity || { x: 0, y: 0, z: 0 };
        const dist = calcDist(player, h); if (dist > MAX_DIST) continue;

        let prediction = dist < 30 ? 0.6 : dist > 100 ? 1.5 : 1.0;
        const predicted = { x: h.x + v.x * prediction, y: h.y + v.y * prediction, z: h.z + v.z * prediction };

        const visible = inFOV(predicted, player);
        const obstacleInSight = t.obstacleBetween && !t.inCrosshair;

        if (!visible || obstacleInSight) continue;

        const yDiff = Math.abs(predicted.y - player.y);
        const score = (1 / dist) * (1 - yDiff / dist) * (t.isFiring || t.aimingAt === player.id ? 1.3 : 1.0);

        if (!squadLockId && score > bestScore) {
          best = { target: t, head: predicted, dist };
          bestScore = score;
        } else if (squadLockId && t.id === squadLockId) {
          best = { target: t, head: predicted, dist };
          break;
        }
      }
    }

    if (best) {
      globalThis._squadTargetId = best.target.id;
      applyLock(best.target, best.head, best.dist, swipe);
    } else {
      globalThis._squadTargetId = null;
    }

    $done({ body: JSON.stringify(data) });
  } catch (e) {
    $done({});
  }
})();
