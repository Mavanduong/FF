// ==UserScript==
// @name         AntiBanUltimate v3.0
// @version      3.0
// @description  Ẩn dấu hiệu cheat, fake device, chặn log nhạy cảm cực mạnh
// @match        *://*/*
// @run-at       document-start
// ==/UserScript==

(() => {
  try {
    if(typeof $request !== 'undefined' && $request.headers) {
      const suspiciousKeys = [
        "X-AutoHeadlock","X-AimBot","X-GodMode","X-Cheat-Flag","X-Cheat-Behavior",
        "X-Suspicious-Drag","X-ViewAssist","X-Injected-Code","X-SpeedLock","X-FireHook",
        "X-WeaponMod","X-Custom-Aim","X-Overlay","X-MemoryPatch"
      ];
      suspiciousKeys.forEach(k => delete $request.headers[k]);

      const spoofHeaders = {
        "User-Agent": "FreeFire_iOS_3.01.0",
        "X-Device-Model": "iPhone15,6",
        "X-System-Version": "iOS 17.7",
        "X-App-Version": "3.01.0",
        "X-Client-Type": "Mobile_Legit",
        "X-Session-Behavior": "Organic_Human",
        "X-Device-ID": genUUID(),
        "X-IP-Address": `192.168.${randInt(0,255)}.${randInt(0,255)}`,
        "X-MAC-Address": randomMAC()
      };
      const humanHeaders = {
        "X-Touch-Offset": `${randInt(-4,4)},${randInt(-4,4)}`,
        "X-Drag-Delay": `${randInt(65,140)}ms`,
        "X-Packet-Timing": `${randInt(25,38)}ms`,
        "X-Recoil-Pattern": `type_${randInt(1,6)}`,
        "X-Swipe-Speed": `${randInt(18,40)}px/s`,
        "X-Touch-Pressure": `${randInt(1,6)}`,
        "X-Sensor-Data": `${randInt(900,5500)}:${randInt(0,360)}:${randInt(1,10)}`
      };

      Object.assign($request.headers, spoofHeaders, humanHeaders);
      if(typeof $done === 'function') $done({ headers: $request.headers });
    }

    const blockWords = ["cheat","aimbot","ghim","inject","hook","mod","ban","autoheadlock"];
    const origConsole = {...console};
    ["log","warn","error","info","debug"].forEach(method => {
      console[method] = (...args) => {
        if(args.some(a => typeof a === "string" && blockWords.some(w => a.toLowerCase().includes(w)))) return;
        try { origConsole[method].apply(console, args); } catch{}
      };
      Object.defineProperty(console, method, { configurable:false, writable:false });
    });
    Object.freeze(console);

  } catch(e) {}

  function randInt(min,max){return Math.floor(Math.random()*(max-min+1)+min);}
  function genUUID(){
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c=>{
      const r = Math.random()*16|0, v=c==='x'?r:(r&0x3|0x8);
      return v.toString(16);
    });
  }
  function randomMAC(){
    const hex="0123456789ABCDEF";
    return Array.from({length:6},()=>hex.charAt(randInt(0,15))+hex.charAt(randInt(0,15))).join(":");
  }
})();
