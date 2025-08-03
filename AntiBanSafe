// ==UserScript==
// @name         AntiBanSafe
// @version      1.0
// @description  Chống ban tài khoản bằng cách giả lập hành vi người chơi, che giấu dấu hiệu cheat
// ==/UserScript==

console.log("🛡 AntiBanSafe Running");

if (!$request || !$request.headers) {
  $done({});
  return;
}

// === Fake Thiết Bị & User-Agent ===
$request.headers["User-Agent"] = "FreeFire_iOS_2.99.0";
$request.headers["X-Device-Model"] = "iPhone14,3";
$request.headers["X-System-Version"] = "iOS 17.5";
$request.headers["X-App-Version"] = "2.99.0";
$request.headers["X-Fake-Client"] = "LegitPlayer";
$request.headers["X-Session-Behavior"] = "Organic";

// === Ngẫu nhiên hóa dữ liệu gói tin ===
function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

$request.headers["X-Touch-Offset"] = `${random(-5, 5)},${random(-5, 5)}`;
$request.headers["X-Drag-Delay"] = `${random(80, 120)}ms`;
$request.headers["X-Packet-Timing"] = `${random(28, 35)}ms`;
$request.headers["X-Recoil-Pattern"] = `type_${random(1, 3)}`;

// === Ẩn dấu hiệu ghim đầu (nếu server check header hoặc marker) ===
delete $request.headers["X-AutoHeadlock"];
delete $request.headers["X-AimBot"];
delete $request.headers["X-GodMode"];

$done({ headers: $request.headers });
