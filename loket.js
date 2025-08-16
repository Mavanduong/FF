// ==UserScript==
// @name         AutoHeadlockProMax v12.5-UltraSquadGod
// @version      12.5
// @description  Ghim đầu 1000% sức mạnh – Không dính thân/chân – Full tốc độ hút đầu mọi tình huống
// ==/UserScript==

const config = {
  aimPower: 999999,             // Siêu lực hút
  lockSpeed: 9999,              // Siêu tốc độ
  predictFactor: 1.75,          // Dự đoán di chuyển
  headPriority: true,           // Ưu tiên đầu tuyệt đối
  avoidBodyZone: true,          // Bỏ qua vùng thân
  avoidLowerZone: true,         // Bỏ qua thân dưới
  stickyLock: true,             // Ghim dính tuyệt đối
  dynamicCorrection: true,      // Tự điều chỉnh khi vuốt lệch
  maxRange: 180,                // Tăng khoảng cách khóa
  reaimDelay: 0,                // Không delay khi khóa lại
  burstControl: true,           // Giữ lock từng viên
  overrideHumanSwipe: true,     // Vuốt lệch vẫn auto vào đầu
  squadLockMode: true,          // Ưu tiên mục tiêu nguy hiểm
};

function onEnemyDetected(enemy) {
  if (!enemy.visible || enemy.health <= 0) return;

  let aimZone = enemy.head;

  if (config.avoidBodyZone && aimZone === enemy.body) return;
  if (config.avoidLowerZone && (aimZone === enemy.legs || aimZone === enemy.feet)) return;

  if (config.headPriority) {
    aimZone = enemy.head;
  }

  game.lockTarget({
    target: enemy,
    zone: aimZone,
    speed: config.lockSpeed,
    power: config.aimPower,
    sticky: config.stickyLock,
    predict: config.predictFactor,
    dynamic: config.dynamicCorrection,
  });
}

game.on('tick', () => {
  const enemies = game.getEnemiesInRange(config.maxRange);
  const validEnemies = enemies.filter(e => e.visible && e.health > 0);

  if (config.squadLockMode) {
    validEnemies.sort((a, b) => b.damageOutput - a.damageOutput); // Ưu tiên địch nguy hiểm
  }

  const target = validEnemies[0];
  if (target) {
    onEnemyDetected(target);
  }
});

