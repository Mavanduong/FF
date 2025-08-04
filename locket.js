// ==UserScript==
// @name         AutoHeadlockProMax v3.8.1
// @version      3.8.1
// @description  Ghim đầu 100%, né hút thân, né bị dí đầu, hỗ trợ MP40, Vector, M1014
// ==/UserScript==

console.log("🎯 AutoHeadlockProMax v3.8.1 ACTIVATED");

const LOCK_FORCE = 3.2;
const STICKY_FORCE = 2.2;
const OFFSET_Y_HEAD = 0.032;
const OFFSET_Y_BODY = 0.007;
const BURST = 5;

let autoLockEnabled = true;
let frameCount = 0;

function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function lockTarget(enemy, pos, i = 0, fakeAim = false, distToTarget = 30) {
  const isCloseRange = distToTarget < 10;
  const closeBoost = isCloseRange ? 1.0 : 0;
  const extraOffset = isCloseRange ? 0.02 : 0;
  const offsetY = fakeAim ? OFFSET_Y_BODY : OFFSET_Y_HEAD + extraOffset;

  const force = i < BURST ? LOCK_FORCE + closeBoost : 1.6;
  const stick = i < BURST ? STICKY_FORCE : 1.2;

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

// ========== NEW: Né Tâm Địch ==========
function avoidEnemyHeadlock(player, enemies) {
  for (const enemy of enemies) {
    if (!enemy || !enemy.viewDirection || !enemy.position) continue;

    const lookVec = enemy.viewDirection;
    const toYou = {
      x: player.position.x - enemy.position.x,
      y: player.position.y - enemy.position.y,
      z: player.position.z - enemy.position.z
    };

    const mag = Math.sqrt(toYou.x**2 + toYou.y**2 + toYou.z**2);
    const dot = (lookVec.x * toYou.x + lookVec.y * toYou.y + lookVec.z * toYou.z) / mag;

    // Nếu dot > 0.98 → địch đang nhìn trực tiếp vào bạn
    if (dot > 0.98 && dist(player.position, enemy.position) < 25) {
      // Né ra nhẹ sang trái hoặc phải (random)
      const offsetX = (Math.random() > 0.5 ? 1 : -1) * 0.4;
      const offsetZ = 0.25;
      game.move({
        x: player.position.x + offsetX,
        y: player.position.y,
        z: player.position.z + offsetZ
      });

      console.log("🛡️ Né tâm địch đang dí đầu bạn!");
    }
  }
}

game.on("tick", () => {
  if (!autoLockEnabled) return;

  const enemies = game.getEnemies().filter(e => e?.isVisible && !e.isDead && e?.position);
  const player = game.getPlayer();
  if (!player || enemies.length === 0) return;

  frameCount++;
  const fakeAim = (frameCount % 20 === 0);

  avoidEnemyHeadlock(player, enemies); // 👈 NÉ TÂM ĐỊCH TRƯỚC

  enemies.sort((a, b) => dist(player, a.position) - dist(player, b.position));

  for (let i = 0; i < Math.min(enemies.length, 5); i++) {
    const e = enemies[i];
    const pos = getBonePosition(e, 8);
    const d = dist(player, pos);
    lockTarget(e, pos, i, fakeAim, d);
  }
});

setInterval(() => {
  if (!autoLockEnabled) return;
  game.setUserAgent("Mozilla/5.0 (FreeFire/HeadlockProMax)");
  game.randomizeInput(0.2);
  game.delayAction(30 + Math.random() * 10);
}, 500);

game.on("keydown", (key) => {
  if (key === "F8") {
    autoLockEnabled = !autoLockEnabled;
    console.log("🔁 AutoHeadlock:", autoLockEnabled ? "ON" : "OFF");
  }
});
