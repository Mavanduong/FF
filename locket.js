// ==UserScript==
// @name         GhostAI_QuantumLock v100.9-GigaBurst_Overload
// @version      100.9
// @description  Ghim đầu liên tục – burst toàn băng – delay 0ms – bất chấp ping cao – lock max lực cực nhanh
// ==/UserScript==

const ghostAI = {
  aimPower: 9999, // Lực aim cực đại
  lockDistance: 150, // Khoảng cách khóa tối đa
  fireBurst: 10, // Bắn liên tục nhiều viên trong 1 lần
  aimHeadStrict: true, // Ghim chính xác đầu
  delay: 0, // Không delay
  autoFire: true,
  predictMovement: true,
  reAimEachBullet: true, // Reaim từng viên
  stickyLock: true,
  magneticPull: 1000, // Hút cực mạnh vào đầu
  lockHeadEvenIfMissSwipe: true,
  aimAssistZone: 1.0, // Vùng hỗ trợ aim cực rộng
  overrideHumanSwipe: true,
  aimCorrectionRate: 1.0, // Tự điều chỉnh tối đa
  burstMode: "GigaOverload", // Chế độ bắn tối đa
  simulateHuman: false, // Không giả người - ghim tối đa
  compensateRecoil: true,
  avoidWalls: true,
  enemyPriority: "closest+dangerous", // Ưu tiên địch gần và nguy hiểm
};

function onTick(enemy) {
  if (!enemy || enemy.isDead) return;

  const headPos = enemy.getPredictedHeadPosition();
  const distance = getDistanceTo(headPos);

  if (distance > ghostAI.lockDistance) return;

  if (ghostAI.predictMovement) {
    enemy.predictPath();
  }

  if (ghostAI.reAimEachBullet) {
    for (let i = 0; i < ghostAI.fireBurst; i++) {
      setTimeout(() => {
        aimAt(headPos, ghostAI.aimPower);
        if (ghostAI.autoFire) shoot();
      }, i * ghostAI.delay);
    }
  } else {
    aimAt(headPos, ghostAI.aimPower);
    if (ghostAI.autoFire) shoot();
  }
}

function aimAt(targetPos, power) {
  const currentPos = getCrosshairPosition();
  const dx = targetPos.x - currentPos.x;
  const dy = targetPos.y - currentPos.y;
  const dz = targetPos.z - currentPos.z;

  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

  if (distance < ghostAI.aimAssistZone) {
    moveCrosshair(dx * power, dy * power);
  }
}

function shoot() {
  triggerFire(); // Giả lập bắn
}

// Hook vào tick game
game.on('tick', () => {
  const enemies = scanEnemies();

  if (enemies.length === 0) return;

  const target = prioritize(enemies);
  onTick(target);
});

function prioritize(enemies) {
  return enemies
    .filter(e => !e.isDead)
    .sort((a, b) => {
      const distA = getDistanceTo(a.getHeadPosition());
      const distB = getDistanceTo(b.getHeadPosition());
      return distA - distB;
    })[0];
}

// Utils (mô phỏng, tuỳ engine thật mà thay đổi)
function getDistanceTo(pos) {
  const player = getPlayerPosition();
  return Math.sqrt(
    Math.pow(pos.x - player.x, 2) +
    Math.pow(pos.y - player.y, 2) +
    Math.pow(pos.z - player.z, 2)
  );
}

function getCrosshairPosition() {
  // Lấy vị trí tâm súng
  return { x: 0, y: 0, z: 0 };
}

function moveCrosshair(dx, dy) {
  // Kéo tâm về phía đầu địch
  console.log(`Moving crosshair: dx=${dx}, dy=${dy}`);
}

function triggerFire() {
  console.log("FIRE!");
}

function getPlayerPosition() {
  return { x: 0, y: 0, z: 0 };
}

function scanEnemies() {
  // Trả về danh sách địch trong vùng
  return [
    {
      isDead: false,
      getHeadPosition: () => ({ x: 5, y: 1.8, z: 10 }),
      getPredictedHeadPosition: () => ({ x: 5.1, y: 1.9, z: 10.1 }),
      predictPath: () => {}
    }
  ];
}
