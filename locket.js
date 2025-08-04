// ==UserScript==
// @name         AutoHeadlockProMax v4.0 GigaGodMode
// @version      4.0
// @description  Ghim đầu địch toàn diện với AI nâng cấp: hút đầu tuyệt đối, redirect đạn, tự bắn, tránh tâm địch, lock tốc độ cao
// ==/UserScript==

console.log("🎯 AutoHeadlockProMax v4.0 GigaGodMode Activated");

if (!$response || !$response.body) {
  $done({});
  return;
}

let body = $response.body;

try {
  let data = JSON.parse(body);

  const HEAD_BONE_INDEX = 8; // chỉ số xương đầu

  function getVectorToHead(target) {
    const head = getBonePosition(target, HEAD_BONE_INDEX);
    return {
      x: head.x - player.position.x,
      y: head.y - player.position.y,
      z: head.z - player.position.z
    };
  }

  function normalizeVector(vec) {
    const length = Math.sqrt(vec.x ** 2 + vec.y ** 2 + vec.z ** 2);
    return { x: vec.x / length, y: vec.y / length, z: vec.z / length };
  }

  function isHeadInCrosshair(target) {
    const head = getBonePosition(target, HEAD_BONE_INDEX);
    return getCrosshairArea().contains(head);
  }

  data.enemies?.forEach(enemy => {
    if (!enemy.visible || !enemy.alive) return;

    let magnetForce = 1.0;
    const distance = getDistance(player.position, enemy.position);

    if (["MP40", "M1014", "Vector"].includes(enemy.weapon)) magnetForce = 1.35;
    else if (distance < 10) magnetForce = 1.45;
    else magnetForce = 1.25;

    // Ghim đầu bằng vector tuyệt đối
    let vectorToHead = getVectorToHead(enemy);
    let aimVector = normalizeVector(vectorToHead);

    player.aimDirection = {
      x: aimVector.x * magnetForce,
      y: aimVector.y * magnetForce,
      z: aimVector.z * magnetForce
    };

    // Auto Corrective Snap mỗi frame
    if (!isHeadInCrosshair(enemy)) {
      player.viewAngle = getAngleTo(enemy, HEAD_BONE_INDEX);
    }

    // Auto redirect đạn khi sắp bắn
    if (player.isFiring && data.bullets) {
      data.bullets.forEach(b => {
        if (b.owner === player.id) {
          let redirect = normalizeVector(getVectorToHead(enemy));
          b.direction = {
            x: redirect.x + Math.random() * 0.001,
            y: redirect.y + Math.random() * 0.001,
            z: redirect.z + Math.random() * 0.001
          };
        }
      });
    }

    // Auto bắn nếu trúng đầu
    if (isHeadInCrosshair(enemy)) {
      player.fireWeapon();
    }

    // Né nếu tâm địch hướng vào đầu mình
    const enemyAim = getVectorToHead(player, enemy);
    const incomingAngle = getAngleBetween(enemy.viewDirection, enemyAim);
    if (incomingAngle < 5) {
      player.dodge(Vector.opposite(enemy.viewDirection), 3); // né về phía ngược hướng địch
    }
  });

  body = JSON.stringify(data);
} catch (err) {
  console.log("[ERR] AutoHeadlockProMax v4.0:", err);
}

$done({ body });
