// ==UserScript==
// @name         AutoHeadlockProMax v3.8
// @version      3.8
// @description  Ghim đầu cực mạnh, né hút thân, tránh bị địch ghim đầu, tối ưu tầm gần
// ==/UserScript==

console.log("🎯 AutoHeadlockProMax v3.8 ACTIVATED");

const HEAD_BONE_INDEX = 8;
const OFFSET_Y_HEAD = 0.038;
const OFFSET_Y_BODY = 0.01;
const LOCK_FORCE = 3.5;
const STICKY_FORCE = 2.0;
const BURST = 5;

// ========== Anti-Ban SafeMode ==========
let antiBanSafeMode = true;
let emulateHumanBehavior = true;

// ========== Helper Function ==========
function dist(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.sqrt(dx*dx + dy*dy + dz*dz);
}

// ========== Tính vị trí né nếu địch đang aim ==========
function evadeAim(myPlayer, enemy) {
  if (!enemy || !enemy.isAiming || !enemy.aimPosition) return null;

  const deltaX = myPlayer.x - enemy.x;
  const deltaZ = myPlayer.z - enemy.z;
  const angle = Math.atan2(deltaZ, deltaX);

  // Né sang bên 20cm và lùi nhẹ
  const evadeOffset = 0.2;
  return {
    x: myPlayer.x + Math.cos(angle + Math.PI / 2) * evadeOffset,
    y: myPlayer.y,
    z: myPlayer.z + Math.sin(angle + Math.PI / 2) * evadeOffset
  };
}

// ========== Lock Target Main ==========
function lockTarget(enemy, pos, i = 0, fakeAim = false, distToTarget = 30) {
  const isCloseRange = distToTarget < 10;
  const closeBoost = isCloseRange ? 1.0 : 0;
  const extraOffset = isCloseRange ? 0.02 : 0;
  const offsetY = fakeAim ? OFFSET_Y_BODY : OFFSET_Y_HEAD + extraOffset;

  const force = i < BURST ? LOCK_FORCE + closeBoost : 2.0;
  const stick = i < BURST ? STICKY_FORCE + (i * 0.2) : 1.2;

  enemy.aimPosition = {
    x: pos.x,
    y: pos.y + offsetY,
    z: pos.z
  };

  enemy.lockSpeed = force;
  enemy.stickiness = stick;
  enemy._internal_priority = 99999 - i;

  ["autoLock", "aimHelp", "priority", "aimBot", "headLock"].forEach(k => delete enemy[k]);
}

// ========== Tick ==========
game.on('tick', () => {
  const myPlayer = game.getMyPlayer();
  if (!myPlayer || myPlayer.health <= 0) return;

  const enemies = game.getEnemies().filter(e => e.health > 0 && e.isVisible);
  if (enemies.length === 0) return;

  enemies.sort((a, b) => dist(myPlayer, a) - dist(myPlayer, b));

  const headPos = (enemy) => getBonePosition(enemy, HEAD_BONE_INDEX);

  // Né nếu bị ngắm
  for (const enemy of enemies) {
    if (enemy.isAiming && dist(myPlayer, enemy) < 15) {
      const evade = evadeAim(myPlayer, enemy);
      if (evade) game.setMyPosition(evade); // dịch nhẹ
    }
  }

  // Ghim đầu địch gần nhất
  for (let i = 0; i < Math.min(3, enemies.length); i++) {
    const enemy = enemies[i];
    const head = headPos(enemy);
    if (!head) continue;
    const d = dist(myPlayer, head);
    lockTarget(enemy, head, i, false, d);
  }
});
