// ==UserScript==
// @name         AntiBanSafe+
// @version      2.0
// @description  Chống ban tuyệt đối - Giả lập người chơi thật, che log, fake thiết bị, giấu dấu hiệu gian lận
// ==/UserScript==

(function () {
  try {
    if (typeof $request === 'undefined' || !$request.headers) return $done({});

    // ========== 🛡 Cấu hình thiết bị giả ==========
    const spoofHeaders = {
      "User-Agent": "FreeFire_iOS_2.99.0",
      "X-Device-Model": "iPhone14,3",
      "X-System-Version": "iOS 17.5",
      "X-App-Version": "2.99.0",
      "X-Fake-Client": "LegitPlayer",
      "X-Session-Behavior": "Organic",
    };

    // ========== 🎲 Ngẫu nhiên hóa hành vi người dùng ==========
    function random(min, max) {
      return Math.floor(Math.random() * (max - min + 1) + min);
    }

    const humanizedHeaders = {
      "X-Touch-Offset": `${random(-4, 4)},${random(-4, 4)}`,
      "X-Drag-Delay": `${random(75, 125)}ms`,
      "X-Packet-Timing": `${random(27, 37)}ms`,
      "X-Recoil-Pattern": `type_${random(1, 4)}`,
      "X-Swipe-Speed": `${random(22, 38)}px/s`,
      "X-Touch-Pressure": `${random(0, 5)}`,
      "X-Sensor-Data": `${random(1000, 5000)}:${random(0, 360)}`,
    };

    // ========== 🚫 Xoá toàn bộ header nghi vấn ==========
    const suspiciousKeys = [
      "X-AutoHeadlock",
      "X-AimBot",
      "X-GodMode",
      "X-Cheat-Flag",
      "X-Cheat-Behavior",
      "X-Suspicious-Drag",
      "X-ViewAssist",
      "X-Injected-Code",
    ];

    for (const key of suspiciousKeys) {
      delete $request.headers[key];
    }

    // ========== 🔒 Giấu dấu vết log ==========
    const originalConsole = { ...console };
    const blockedLogs = ["AntiBanSafe", "cheat", "aimbot", "ghim", "hook", "inject"];

    for (const method of ["log", "warn", "error", "info", "debug"]) {
      console[method] = function (...args) {
        if (args.some(arg => typeof arg === 'string' && blockedLogs.some(b => arg.toLowerCase().includes(b)))) return;
        originalConsole[method](...args);
      };
    }

    // ========== 🧠 Gộp header lại và trả về ==========
    Object.assign($request.headers, spoofHeaders, humanizedHeaders);

    $done({ headers: $request.headers });

  } catch (err) {
    // Chặn luôn lỗi bị log
    typeof $done === 'function' && $done({});
  }
})();
