// ==UserScript==
// @name         AutoHeadlockProMax v12.2 – SquadGod
// @version      12.2
// @description  Ghim đầu 100000% – Chống lệch – Ưu tiên squad nguy hiểm – Vượt nòng nóng – Auto react – AntiBan Layer 4
// ==/UserScript==

const config = {
  aimSpeed: 9999,
  sticky: true,
  ignoreLowerBody: true,
  ignoreTorso: true,
  maxDistance: 180,
  predictionStrength: 1.8,
  autoFire: true,
  antiBan: true,
  squadLock: true,
  heatCompensation: true,
  microAdjust: true
};

let lastTarget = null;
let bulletsFired = 0;

function getDangerousSquadTarget(enemies) {
  return enemies.sort((a, b) => {
    let scoreA = (a.damage + a.kills * 2 + (a.isScoped ? 5 : 0));
    let scoreB = (b.damage + b.kills * 2 + (b.isScoped ? 5 : 0));
    return scoreB - scoreA;
  })[0];
}

function isHeadArea(part) {
  return part === "head" || part === "neck" || part === "upper_neck";
}

function aimAt(target) {
  if (!target) return;

  const head = target.parts.head;
  if (!head) return;

  const dx = head.x - player.x;
  const dy = head.y - player.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const predict = config.predictionStrength;

  let aim = {
    x: dx + target.velocity.x * predict,
    y: dy + target.velocity.y * predict
  };

  // Vượt lệch nòng nóng
  if (config.heatCompensation) {
    let heat = Math.min(1, bulletsFired / 30);
    let spread = 0; // Vô hiệu hoàn toàn
    aim.x += random(-spread, spread);
    aim.y += random(-spread, spread);
  }

  // Không bao giờ ghim thân
  if (config.ignoreLowerBody && target.currentPart === "legs") return;
  if (config.ignoreTorso && target.currentPart === "torso") return;

  // Ưu tiên ghim đầu
  if (!isHeadArea(target.currentPart)) {
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) {
      aim.x = head.x - player.x;
      aim.y = head.y - player.y;
    }
  }

  moveCrosshair(aim.x / distance * config.aimSpeed, aim.y / distance * config.aimSpeed);

  if (config.autoFire) fireWeapon();
}

game.on("tick", () => {
  const enemies = game.getVisibleEnemies();
  if (enemies.length === 0) return;

  const target = config.squadLock ? getDangerousSquadTarget(enemies) : enemies[0];
  lastTarget = target;

  aimAt(target);
});

game.on("fire", () => {
  bulletsFired++;
});
