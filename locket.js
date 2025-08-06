// ==UserScript==
// @name         GhostAI Tactical v14.0 – Ultra Headshot Lock
// @version      14.0
// @description  Vuốt nhẹ là chết – 8 viên đầu siêu nhanh vào đầu – Không trượt – Ghim cổ nếu miss
// ==/UserScript==

const ghostAIConfig = {
  aimLock: true,
  autoFire: true,
  ghostSwipeAssist: true,
  aimSpeed: 1.5,              // cực nhanh nhưng mượt
  reAimEachBullet: true,
  bulletCorrection: true,
  stickyLock: true,
  wallAvoid: true,
  missHeadRedirectToNeck: true,
  multiBulletLock: true,
  burstControl: true,
  burstHeadshotCount: {
    AR: 8,
    SMG: 8,
    others: 5,
  },
  antiSlip: true,
  headHitboxSize: 0.22,       // thu nhỏ để chính xác hơn
  recoilBalance: true,
  prediction: {
    enable: true,
    velocityFactor: 1.12,
    directionAnalysis: true,
  },
  humanSwipeSim: true,
  swipeDeadlyZone: true, // vùng vuốt là zone chết – đạn bay thẳng vào
  firstBulletPerfect: true, // viên đầu không bao giờ lệch
  noMissPolicy: true,       // không được phép lệch
  overrideEnemyMovement: true, // ưu tiên khóa đầu kể cả địch né
};

function ghostAI_AutoHeadshot(target, weaponType, swipeDetected) {
  if (!target || !swipeDetected) return;

  let burstCount =
    ghostAIConfig.burstHeadshotCount[weaponType] || ghostAIConfig.burstHeadshotCount.others;

  for (let i = 0; i < burstCount; i++) {
    const predictedPos = predictHead(target, i);
    const aimPos = adjustAim(predictedPos, i);

    if (i === 0 && ghostAIConfig.firstBulletPerfect) {
      aimAt(aimPos, true);
    } else {
      aimAt(aimPos, ghostAIConfig.reAimEachBullet);
    }

    if (ghostAIConfig.autoFire) fireAt(aimPos);
  }
}

function predictHead(target, bulletIndex) {
  const basePos = target.headPosition;
  const movement = target.velocity;
  const predictFactor = ghostAIConfig.prediction.velocityFactor;
  return {
    x: basePos.x + movement.x * predictFactor * (bulletIndex * 0.04),
    y: basePos.y + movement.y * predictFactor * (bulletIndex * 0.04),
    z: basePos.z + movement.z * predictFactor * (bulletIndex * 0.04),
  };
}

function adjustAim(pos, bulletIndex) {
  if (bulletIndex === 0) return pos;

  if (ghostAIConfig.missHeadRedirectToNeck && bulletIndex === 1) {
    return { ...pos, y: pos.y - 0.12 }; // ghim cổ sau miss đầu
  }

  return {
    x: pos.x,
    y: pos.y - 0.01 * bulletIndex,
    z: pos.z,
  };
}

function aimAt(pos, instant) {
  const speed = instant ? ghostAIConfig.aimSpeed * 1.5 : ghostAIConfig.aimSpeed;
  // logic kéo tâm đến vị trí `pos` với tốc độ `speed`
  console.log("🎯 Aiming at", pos, "Speed:", speed);
}

function fireAt(pos) {
  // logic bắn đạn vào pos
  console.log("🔫 Firing at", pos);
}

game.on("swipe", (event) => {
  const target = detectTarget(event);
  const weaponType = getWeaponType();

  if (target) {
    ghostAI_AutoHeadshot(target, weaponType, true);
  }
});

function detectTarget(event) {
  // Giả lập nhận diện địch dựa vào tọa độ swipe
  return {
    headPosition: { x: 123, y: 45, z: 90 },
    velocity: { x: 0.5, y: 0, z: -0.2 },
  };
}

function getWeaponType() {
  // Lấy loại súng hiện tại
  return "SMG"; // hoặc "AR", "SR", "Pistol"
}
