// ==UserScript==
// @name         FixRecoil
// @version      1.0
// @description  Xoá giật, xoá rung, giữ tâm cực ổn định cho mọi vũ khí
// ==/UserScript==

console.log("🔧 FixRecoil Activated");

if (!$response || !$response.body) {
  $done({});
  return;
}

let body = $response.body;

try {
  let data = JSON.parse(body);

  if (data && data.weaponStats) {
    for (let weapon of data.weaponStats) {
      weapon.recoil = 0;
      weapon.verticalRecoil = 0;
      weapon.horizontalRecoil = 0;
      weapon.shake = 0;
      weapon.spread = 0.005; // rất nhỏ, đạn bắn chính xác hơn
      weapon.recoilRecovery = 9999; // hồi tâm ngay lập tức
      weapon.stability = 9999; // giữ tâm không bị lệch
    }
  }

  body = JSON.stringify(data);
} catch (e) {
  console.log("❌ FixRecoil error: " + e);
}

$done({ body });
