// ==UserScript==
// @name         AutoHeadlockProMax v3.8-Ultimate
// @description  Ghim đầu 100%, tránh bị dí đầu, tự bắn khi lock, boost lực gần
// ==/UserScript==

console.log("🎯 AutoHeadlockProMax v3.8-Ultimate ACTIVATED");

if (!$response || !$response.body) {
  $done({});
  return;
}

let body = $response.body;

try {
  let data = JSON.parse(body);

  const HEAD_BONE = 8;
  const OFFSET_Y_HEAD = 0.022;
  const OFFSET_Y_BODY = 0.005;
  const LOCK_FORCE = 3.2;
  const STICKY_FORCE = 2.6;
  const BURST = 5;

  const dist = (a, b) => Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2 + (a.z-b.z)**2);

  function lockTarget(enemy, pos, i = 0, fakeAim = false, player) {
    const distToTarget = dist(player, pos);
    const isCloseRange = distToTarget < 10;

    const antiMagnetBoost = isCloseRange ? 0.02 : 0;
    const evadeOffset = avoidHeadGhim(player, enemy) ? 0.015 : 0;
    const offsetY = fakeAim ? OFFSET_Y_BODY : OFFSET_Y_HEAD + antiMagnetBoost + evadeOffset;

    const force = i < BURST ? LOCK_FORCE + (isCloseRange ? 1.2 : 0) : 1.8;
    const stick = i < BURST ? STICKY_FORCE : 1.5;

    enemy.aimPosition = {
      x: pos.x,
      y: pos.y + offsetY,
      z: pos.z
    };

    enemy.lockSpeed = force;
    enemy.stickiness = stick;
    enemy._internal_priority = 99999 - i;

    ["autoLock", "aimHelp", "priority", "aimBot", "headLock"].forEach(k => delete enemy[k]);

    // ✅ Tự bắn sau khi lock nếu gần và ghim chính xác
    if (isCloseRange && i === 0) {
      if (typeof fireWeapon === 'function') {
        setTimeout(() => fireWeapon(), 10); // delay 10ms sau khi ghim để auto fire
      }
    }
  }

  // 🚫 Né địch đang ghim đầu mình
  function avoidHeadGhim(player, enemy) {
    const lookingAt = enemy?.lookAt || {};
    const aimAtMe = dist(lookingAt, player) < 0.5;
    return aimAtMe;
  }

  if (data?.players && data?.me) {
    const enemies = data.players.filter(p => p.team !== data.me.team && p.alive);

    enemies.forEach((enemy, i) => {
      const bone = enemy?.bones?.[HEAD_BONE];
      if (!bone) return;

      // Lock từng enemy
      lockTarget(enemy, bone, i, false, data.me);
    });
  }

  body = JSON.stringify(data);
} catch (e) {
  console.log("⚠️ AutoHeadlock Error:", e);
}

$done({ body });
