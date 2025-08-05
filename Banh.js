// ==UserScript==
// @name         AntiBanSafe+ v3.0 - Ultimate Stealth
// @version      3.0
// @description  Chống ban tối đa - ẩn hành vi cheat, giả thiết bị, mô phỏng người chơi thật
// ==/UserScript==

(function () {
  try {
    if (typeof $request === 'undefined' || !$request.headers) return $done({});

    // 🎯 Thiết bị giả
    const spoofHeaders = {
      "User-Agent": "FreeFire_iOS_2.99.0",
      "X-Device-Model": "iPhone15,3",
      "X-System-Version": "iOS 17.6",
      "X-App-Version": "2.99.0",
      "X-Client-Type": "Mobile_Legit",
      "X-Session-Behavior": "Organic_Human",
      "X-Device-ID": `${genUUID()}`,
      "X-IP-Address": `192.168.${random(0, 255)}.${random(0, 255)}`,
      "X-MAC-Address": randomMAC()
    };

    // 🎮 Hành vi người chơi thật
    const humanizedHeaders = {
      "X-Touch-Offset": `${random(-3, 3)},${random(-3, 3)}`,
      "X-Drag-Delay": `${random(70, 130)}ms`,
      "X-Packet-Timing": `${random(27, 37)}ms`,
      "X-Recoil-Pattern": `type_${random(1, 5)}`,
      "X-Swipe-Speed": `${random(21, 37)}px/s`,
      "X-Touch-Pressure": `${random(1, 5)}`,
      "X-Sensor-Data": `${random(1000, 5000)}:${random(0, 360)}:${random(1, 9)}`
    };

    // 🚫 Xoá toàn bộ dấu hiệu cheat
    const suspiciousKeys = [
      "X-AutoHeadlock", "X-AimBot", "X-GodMode", "X-Cheat-Flag", "X-Cheat-Behavior",
      "X-Suspicious-Drag", "X-ViewAssist", "X-Injected-Code", "X-SpeedLock", "X-FireHook",
      "X-WeaponMod", "X-Custom-Aim", "X-Overlay", "X-MemoryPatch"
    ];

    suspiciousKeys.forEach(key => delete $request.headers[key]);

    // 🛡️ Bảo vệ log (giấu & chống bị hook lại)
    const blockedWords = ["cheat", "aimbot", "ghim", "inject", "hook", "mod", "ban"];
    const originalConsole = { ...console };

    ["log", "warn", "error", "info", "debug"].forEach(method => {
      console[method] = function (...args) {
        if (args.some(arg => typeof arg === 'string' && blockedWords.some(w => arg.toLowerCase().includes(w)))) return;
        try {
          originalConsole[method].apply(console, args);
        } catch (e) {}
      };
      Object.defineProperty(console, method, {
        configurable: false,
        writable: false
      });
    });

    // 🔐 Không cho inject lại
    Object.freeze(console);

    // 🧠 Gộp và gửi lại header
    Object.assign($request.headers, spoofHeaders, humanizedHeaders);
    $done({ headers: $request.headers });

    // ======== ⚙️ Helper function ========
    function random(min, max) {
      return Math.floor(Math.random() * (max - min + 1) + min);
    }

    function genUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }

    function randomMAC() {
      const hex = "0123456789ABCDEF";
      return Array.from({ length: 6 }, () =>
        hex.charAt(Math.floor(Math.random() * 16)) +
        hex.charAt(Math.floor(Math.random() * 16))
      ).join(":");
    }

  } catch (err) {
    if (typeof $done === 'function') $done({});
  }
})();
