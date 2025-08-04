// ==UserScript==
// @name         AutoHeadlockProMax v3.8-Final
// @description  Ghim đầu đa chế độ, chống dính thân, tự bắn, né tâm địch
// ==/UserScript==

console.log("🎯 AutoHeadlockProMax v3.8 Final ACTIVATED");

const HEAD_BONE_INDEX = 8;
const BURST = 5;
const OFFSET_Y_HEAD = 0.018;
const OFFSET_Y_BODY = 0.006;
const LOCK_FORCE = 3.0;
const STICKY_FORCE = 1.4;

let fireCooldown = 0;

function getBonePosition(entity, index = HEAD_BONE_INDEX) {
  return typeof entity.getBonePos === 'function' ? entity.getBonePos(index) : { x: 0, y: 0, z: 0 };
}

function dist(p1, p2) {
  const dx = p1.x - p2.x, dy = p1.y - p2.y, dz = p1.z - p2.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function aimAtHead(enemy, index = 0, fakeAim = false) {
  if (!enemy) return;

  const headPos = getBonePosition(enemy, HEAD_BONE_INDEX);
  const playerPos = getPlayerPosition();
  const d = dist(playerPos, headPos);
  const isClose = d < 10;

  const offsetY = fakeAim ? OFFSET_Y_BODY : OFFSET_Y_HEAD + (isClose ? 0.02 : 0);
  const force = index < BURST ? LOCK_FORCE + (isClose ? 1.2 : 0) : 1.6;
  const sticky = index < BURST ? STICKY_FORCE : 1.1;

  enemy.aimPosition = {
    x: headPos.x,
    y: headPos.y + offsetY,
    z: headPos.z
  };

  enemy.lockSpeed = force;
  enemy.stickiness = sticky;
  enemy._internal_priority = 99999 - index;

  // Auto-shoot logic
  if (index === 0 && fireCooldown <= 0) {
    shoot();
    fireCooldown = 5;
  }

  ["autoLock", "aimHelp", "priority", "aimBot", "headLock"].forEach(k => delete enemy[k]);
}

function getPlayerPosition() {
  return typeof getSelfPos === 'function' ? getSelfPos() : { x: 0, y: 0, z: 0 };
}

function shoot() {
  if (typeof pressButton === 'function') pressButton("fire");
}

function evadeEnemyAim(enemies) {
  if (!enemies || enemies.length === 0) return;
  const selfPos = getPlayerPosition();

  enemies.forEach(e => {
    const pos = getBonePosition(e, HEAD_BONE_INDEX);
    const angleToMe = Math.atan2(selfPos.y - pos.y, selfPos.x - pos.x);
    const playerAngle = typeof getViewAngle === 'function' ? getViewAngle() : 0;

    const diff = Math.abs(playerAngle - angleToMe);
    if (diff < 0.2) {
      // Họ đang dí tâm vào ta → tránh nhẹ về bên
      const evadeX = selfPos.x + Math.random() * 0.2 - 0.1;
      const evadeZ = selfPos.z + Math.random() * 0.2 - 0.1;
      if (typeof moveTo === 'function') moveTo(evadeX, selfPos.y, evadeZ);
    }
  });
}

// Tick logic
let lockIndex = 0;
game.on("tick", () => {
  const enemies = typeof getEnemies === 'function' ? getEnemies() : [];
  if (!enemies || enemies.length === 0) return;

  fireCooldown = Math.max(0, fireCooldown - 1);

  // Né tâm địch
  evadeEnemyAim(enemies);

  // Ưu tiên gần và lộ đầu
  enemies.sort((a, b) => {
    const d1 = dist(getPlayerPosition(), getBonePosition(a));
    const d2 = dist(getPlayerPosition(), getBonePosition(b));
    return d1 - d2;
  });

  const mainEnemy = enemies[0];
  if (!mainEnemy) return;

  aimAtHead(mainEnemy, lockIndex++);
  if (lockIndex > 99) lockIndex = 0;
});
