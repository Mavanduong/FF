// ==UserScript==
// @name         AutoHeadlockProMax v2.2 Always-On
// @version      2.2
// @description  Ghim đầu 100% + không tắt khi bị xem + giả lập người thật
// ==/UserScript==

console.log("🔥 AutoHeadlockProMax v2.2 Always-On ACTIVATED");

if (!$response || !$response.body) return $done({});

let body = $response.body;

try {
  const HEAD_BONE = "head";
  const MAX_DISTANCE = 120;
  const PREDICTION = 1.2;
  const AIM_PRIORITY = 999;

  let data = JSON.parse(body);
  const player = data.player;

  function isInFOV(enemy, player, maxAngle = 45) {
    const dx = enemy.x - player.x, dy = enemy.y - player.y, dz = enemy.z - player.z;
    const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
    if (dist === 0) return false;
    const forward = player.direction || { x: 0, y: 0, z: 1 };
    const dot = (dx * forward.x + dy * forward.y + dz * forward.z) / dist;
    const angle = Math.acos(dot) * (180 / Math.PI);
    return angle < maxAngle;
  }

  function applySmartLock(enemy, targetPos) {
    const jitter = (Math.random() - 0.5) * 0.015;
    enemy.aimPosition = {
      x: targetPos.x + jitter,
      y: targetPos.y + jitter,
      z: targetPos.z + jitter
    };
    enemy.smoothLock = true;
    enemy.lockSpeed = 0.92 + Math.random() * 0.03;
    enemy.stickiness = 0.93 + Math.random() * 0.04;
  }

  if (data && data.targets) {
    for (let enemy of data.targets) {
      if (!enemy?.bone?.[HEAD_BONE]) continue;

      const head = enemy.bone[HEAD_BONE];
      const dx = head.x - player.x;
      const dy = head.y - player.y;
      const dz = head.z - player.z;
      const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
      if (distance > MAX_DISTANCE) continue;

      const v = enemy.velocity || { x: 0, y: 0, z: 0 };
      const predictHead = {
        x: head.x + v.x * PREDICTION,
        y: head.y + v.y * PREDICTION,
        z: head.z + v.z * PREDICTION
      };

      if (enemy.obstacleBetween) continue;
      if (!isInFOV(predictHead, player)) continue;

      if (["standing", "jumping", "crouching"].includes(enemy.posture)) {
        applySmartLock(enemy, predictHead);

        enemy.autoLock = true;
        enemy.recoilControl = true;
        enemy.lockZone = "HEAD";
        enemy.aimHelp = true;
        enemy.priority = AIM_PRIORITY;

        // Fake người thật
        enemy.obfuscatePattern = true;
        enemy.fakeInputVariation = true;
        enemy.emulateHumanDelay = true;
      }
    }
  }

  body = JSON.stringify(data);
} catch (e) {
  console.log("❌ AutoHeadlockProMax v2.2 ERROR: " + e);
}

$done({ body });
