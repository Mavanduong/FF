// ==UserScript==
// @name         AutoHeadlockProMax v4.1 – Full Path Search Headlock
// @version      4.1
// @description  Tìm mọi hướng ghim vào đầu, chọn đường tối ưu nhất, không gì ngăn được
// ==/UserScript==

(function () {
  try {
    if (!$response || !$response.body) return $done({});
    let body = $response.body;
    let data = JSON.parse(body);

    const HEAD_BONE = "head";
    const HEAD_OFFSET_Y = 0.042;
    const LOCK_FORCE = 3.6;
    const STICKY_FORCE = 2.6;
    const SEARCH_ANGLES = [
      { x: 0, y: 0, z: 0 }, // thẳng
      { x: 0.1, y: 0, z: 0 },  // lệch phải
      { x: -0.1, y: 0, z: 0 }, // lệch trái
      { x: 0, y: 0.1, z: 0 },  // lệch lên
      { x: 0, y: -0.1, z: 0 }, // lệch xuống
      { x: 0.1, y: 0.1, z: 0 },   // chéo phải lên
      { x: -0.1, y: 0.1, z: 0 },  // chéo trái lên
      { x: 0.1, y: -0.1, z: 0 },  // chéo phải xuống
      { x: -0.1, y: -0.1, z: 0 }  // chéo trái xuống
    ];

    const player = data.player || {};

    function distance(a, b) {
      const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    function normalize(v) {
      const mag = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z) + 0.0001;
      return { x: v.x / mag, y: v.y / mag, z: v.z / mag };
    }

    function offsetVector(v, offset) {
      return {
        x: v.x + offset.x,
        y: v.y + offset.y,
        z: v.z + offset.z
      };
    }

    function predict(pos, vel, time) {
      return {
        x: pos.x + vel.x * time,
        y: pos.y + vel.y * time,
        z: pos.z + vel.z * time
      };
    }

    function directionSimilarity(a, b) {
      const magA = Math.sqrt(a.x*a.x + a.y*a.y + a.z*a.z);
      const magB = Math.sqrt(b.x*b.x + b.y*b.y + b.z*b.z);
      return (a.x*b.x + a.y*b.y + a.z*b.z) / (magA * magB + 0.0001);
    }

    function applyLock(enemy, pos) {
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

    let bestLock = null;
    let bestScore = -Infinity;

    if (Array.isArray(data.targets)) {
      for (const e of data.targets) {
        const head = e?.bone?.[HEAD_BONE];
        if (!head) continue;

        const vel = e.velocity || { x: 0, y: 0, z: 0 };
        const dist = distance(player, head);
        const predictTime = 1.2 * (dist / 100);
        const predicted = predict(head, vel, predictTime);

        for (const angle of SEARCH_ANGLES) {
          const dir = normalize({
            x: predicted.x - player.x,
            y: predicted.y - player.y,
            z: predicted.z - player.z
          });
          const adjusted = offsetVector(dir, angle);
          const aimLine = normalize(adjusted);
          const sim = directionSimilarity(aimLine, dir);
          const penalty = 1 - sim;

          const score =
            (1 / dist) *
            (e.isFiring ? 1.5 : 1.0) *
            (1 - penalty) *
            100;

          if (score > bestScore) {
            bestScore = score;
            bestLock = { enemy: e, pos: predicted };
          }
        }
      }
    }

    if (bestLock) {
      applyLock(bestLock.enemy, bestLock.pos);
    }

    $done({ body: JSON.stringify(data) });

  } catch (err) {
    $done({});
  }
})();
