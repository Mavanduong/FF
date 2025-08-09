// ==UserScript==
// @name         Ultimate AntiBan Stealth v1.0
// @version      1.0
// @description  Ẩn dấu hiệu cheat, giả lập thiết bị & hành vi tự nhiên, bảo vệ console, chống hook, không làm chậm game
// ==/UserScript==

(function() {
  try {
    if (typeof $request === 'undefined' || !$request.headers) return $done({});

    // ======= Fake thiết bị & mạng =======
    const spoofHeaders = {
      "User-Agent": randomUserAgent(),
      "X-Device-Model": randomDeviceModel(),
      "X-System-Version": randomSystemVersion(),
      "X-App-Version": randomAppVersion(),
      "X-Client-Type": "Mobile_Legit",
      "X-Session-Behavior": "Organic_Human",
      "X-Device-ID": genUUID(),
      "X-IP-Address": `192.168.${rand(0,255)}.${rand(0,255)}`,
      "X-MAC-Address": randomMAC(),
      "X-Fake-Ping": `${rand(170, 230)}ms`
    };

    // ======= Giả lập hành vi người chơi =======
    const humanBehaviorHeaders = {
      "X-Touch-Offset": `${rand(-6,6)},${rand(-6,6)}`,
      "X-Drag-Delay": `${rand(60,140)}ms`,
      "X-Packet-Timing": `${rand(25,40)}ms`,
      "X-Recoil-Pattern": `type_${rand(1,9)}`,
      "X-Swipe-Speed": `${rand(17,45)}px/s`,
      "X-Touch-Pressure": `${rand(1,6)}`,
      "X-Sensor-Data": `${rand(900,5600)}:${rand(0,360)}:${rand(1,10)}`
    };

    // ======= Xóa hết header nghi ngờ =======
    const suspiciousKeys = [
      "X-AutoHeadlock", "X-AimBot", "X-GodMode", "X-Cheat-Flag", "X-Cheat-Behavior",
      "X-Suspicious-Drag", "X-ViewAssist", "X-Injected-Code", "X-SpeedLock", "X-FireHook",
      "X-WeaponMod", "X-Custom-Aim", "X-Overlay", "X-MemoryPatch", "X-Hack", "X-Bot"
    ];
    suspiciousKeys.forEach(k => delete $request.headers[k]);

    // ======= Bảo vệ console - chặn log có từ khóa nhạy cảm =======
    const blockedWords = ["cheat","aimbot","ghim","inject","hook","mod","ban","lock","snap","bot","hack"];
    const originalConsole = {...console};
    ["log","warn","error","info","debug"].forEach(method => {
      console[method] = function(...args) {
        if (args.some(arg => typeof arg === 'string' && blockedWords.some(w => arg.toLowerCase().includes(w)))) return;
        try { originalConsole[method].apply(console,args); } catch(e) {}
      };
      Object.defineProperty(console, method, { configurable:false, writable:false });
    });
    Object.freeze(console);

    // ======= Gộp header cuối cùng =======
    Object.assign($request.headers, spoofHeaders, humanBehaviorHeaders);

    $done({ headers: $request.headers });

    // ======= Helper functions =======
    function rand(min, max) { return Math.floor(Math.random() * (max - min + 1) + min); }

    function genUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }

    function randomMAC() {
      const hex = "0123456789ABCDEF";
      return Array.from({ length: 6 }, () =>
        hex.charAt(rand(0,15)) + hex.charAt(rand(0,15))
      ).join(":");
    }

    function randomUserAgent() {
      const agents = [
        "FreeFire_iOS_2.99.0", "FreeFire_Android_2.99.0",
        "FreeFire_iOS_2.98.5", "FreeFire_Android_2.98.5"
      ];
      return agents[rand(0, agents.length - 1)];
    }

    function randomDeviceModel() {
      const models = ["iPhone15,3","iPhone14,6","iPhone13,4","Samsung SM-G998B","Samsung SM-G996B"];
      return models[rand(0, models.length - 1)];
    }

    function randomSystemVersion() {
      const versions = ["iOS 17.6","iOS 17.5","Android 12","Android 13"];
      return versions[rand(0, versions.length - 1)];
    }

    function randomAppVersion() {
      const versions = ["2.99.0","2.98.5","2.97.0"];
      return versions[rand(0, versions.length - 1)];
    }

  } catch (e) {
    if (typeof $done === "function") $done({});
  }
})();
