// ==UserScript==
// @name         AntiBanUltimate v4.0-GodShield
// @version      4.0
// @description  Ẩn dấu hiệu cheat tối đa, fake device động, chặn log & API nhạy cảm, mô phỏng hành vi người chơi thực
// @match        *://*/*
// @run-at       document-start
// ==/UserScript==

(() => {
  try {
    if (typeof $request !== 'undefined' && $request.headers) {
      const suspiciousKeys = [
        "X-AutoHeadlock","X-AimBot","X-GodMode","X-Cheat-Flag","X-Cheat-Behavior",
        "X-Suspicious-Drag","X-ViewAssist","X-Injected-Code","X-SpeedLock","X-FireHook",
        "X-WeaponMod","X-Custom-Aim","X-Overlay","X-MemoryPatch"
      ];
      suspiciousKeys.forEach(k => delete $request.headers[k]);

      // Xóa trong body/query
      if ($request.body && typeof $request.body === "string") {
        suspiciousKeys.concat(["cheat","aimbot","inject","hook","autoheadlock"])
          .forEach(word => $request.body = $request.body.replace(new RegExp(word,"gi"), ""));
      }
      if ($request.url) {
        suspiciousKeys.concat(["cheat","aimbot","inject","hook","autoheadlock"])
          .forEach(word => $request.url = $request.url.replace(new RegExp(word,"gi"), ""));
      }

      // Fake device nâng cao
      const spoofHeaders = {
        "User-Agent": `FreeFire_iOS_${randInt(3,5)}.${randInt(0,99)}.${randInt(0,9)}`,
        "X-Device-Model": randomDeviceModel(),
        "X-System-Version": `iOS ${randInt(15,18)}.${randInt(0,9)}`,
        "X-App-Version": `${randInt(3,5)}.${randInt(0,99)}.${randInt(0,9)}`,
        "X-Client-Type": "Mobile_Legit",
        "X-Session-Behavior": randomSessionBehavior(),
        "X-Device-ID": genUUID(),
        "X-IP-Address": `192.168.${randInt(0,255)}.${randInt(0,255)}`,
        "X-MAC-Address": randomMAC(),
        "X-Battery-Level": `${randInt(20,100)}%`,
        "X-GPS": `${randFloat(-90,90)},${randFloat(-180,180)}`,
        "X-Orientation": Math.random()>0.5?"portrait":"landscape"
      };
      const humanHeaders = {
        "X-Touch-Offset": `${randInt(-5,5)},${randInt(-5,5)}`,
        "X-Drag-Delay": `${randInt(50,150)}ms`,
        "X-Packet-Timing": `${randInt(20,40)}ms`,
        "X-Recoil-Pattern": `type_${randInt(1,8)}`,
        "X-Swipe-Speed": `${randInt(15,50)}px/s`,
        "X-Touch-Pressure": `${randInt(1,8)}`,
        "X-Sensor-Data": `${randInt(800,6000)}:${randInt(0,360)}:${randInt(1,10)}`
      };

      Object.assign($request.headers, spoofHeaders, humanHeaders);
      if (typeof $done === 'function') $done({ headers: $request.headers });
    }

    // Chặn console log nhạy cảm
    const blockWords = ["cheat","aimbot","ghim","inject","hook","mod","ban","autoheadlock"];
    const origConsole = {...console};
    ["log","warn","error","info","debug"].forEach(method => {
      console[method] = (...args) => {
        if (args.some(a => typeof a === "string" && blockWords.some(w => a.toLowerCase().includes(w)))) return;
        try { origConsole[method].apply(console, args); } catch {}
      };
      Object.defineProperty(console, method, { configurable:false, writable:false });
    });
    Object.freeze(console);

    // Chặn API nhạy cảm
    const blockEval = () => { throw new Error("Eval blocked for security"); };
    window.eval = blockEval;
    window.Function = blockEval;
    const wsSend = WebSocket.prototype.send;
    WebSocket.prototype.send = function(data){
      if (typeof data === "string" && blockWords.some(w => data.toLowerCase().includes(w))) return;
      return wsSend.apply(this, arguments);
    };

  } catch(e) {}

  function randInt(min,max){return Math.floor(Math.random()*(max-min+1)+min);}
  function randFloat(min,max){return (Math.random()*(max-min)+min).toFixed(6);}
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
  function randomDeviceModel(){
    const models=["iPhone15,6","iPhone14,7","iPhone13,4","iPhone12,5","iPhone11,8"];
    return models[randInt(0,models.length-1)];
  }
  function randomSessionBehavior(){
    const behaviors=["Organic_Human","Pro_Player","Casual_Play","Spectator_Mode"];
    return behaviors[randInt(0,behaviors.length-1)];
  }
})();
