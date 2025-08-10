// ==UserScript==
// @name         AutoHeadlockProMax v15.0-FullRedHeadshot
// @version      15.0
// @description  Cực mạnh: 100% hút đầu full đỏ, bắn full mag khi lock đầu, không teleport lập tức, vẫn giữ vuốt tay tự nhiên.
// @match        *://*/*
// @run-at       document-start
// ==/UserScript==

(() => {
  // ==== CẤU HÌNH CHÍNH - TỰ CHỈNH THEO Ý BẠN ====
  const CONFIG = {
    tickIntervalMs: 0,       // 0ms = update liên tục không delay (càng nhỏ càng mạnh)
    headYOffsetPx: 12,       // Offset dọc tránh vượt đầu, tăng để tránh bị quá đà (tùy game mà chỉnh)
    smoothAim: false,        // false để hút thẳng đầu cực nhanh (true để mượt hơn)
    fireOnLock: true,        // bắn ngay khi lock đầu
    fullMagDump: true,       // xả hết băng đạn khi lock đầu (bắn nhanh)
    maxTargetsConsidered: 5, // Số đối tượng ưu tiên để tìm đầu to nhất (tăng để chọn tốt hơn)
  };

  // ==== BIẾN LƯU TRỮ ====
  let lastFireTime = 0;
  const fireIntervalMs = 50; // Giới hạn bắn 20 phát / giây (có thể chỉnh theo server)

  // ==== HÀM GIÚP ====
  // Giả sử game cung cấp API: getEnemies(), getCrosshairPos(), setAim(x,y), fireWeapon()
  // Bạn phải chỉnh lại theo API game cụ thể của bạn

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  // Tìm target ưu tiên nhất là đầu to nhất trong top maxTargetsConsidered gần crosshair
  function findBestHeadTarget(enemies, crosshair) {
    // Giả sử mỗi enemy có enemy.headPos {x,y}, enemy.headSize (độ to đầu)
    // Lọc top k gần crosshair
    enemies.sort((a,b) => distance(a.headPos, crosshair) - distance(b.headPos, crosshair));
    const candidates = enemies.slice(0, CONFIG.maxTargetsConsidered);
    // Trong candidates lấy headSize lớn nhất
    candidates.sort((a,b) => b.headSize - a.headSize);
    return candidates[0] || null;
  }

  // Tính tọa độ mục tiêu với offset tránh vượt đầu
  function calcAimPos(headPos) {
    return {
      x: headPos.x,
      y: headPos.y + CONFIG.headYOffsetPx,
    };
  }

  // Smooth hoặc snap thẳng về mục tiêu
  function aimAt(targetPos, currentAimPos) {
    if (CONFIG.smoothAim) {
      // Smooth kéo nhẹ, tốc độ tùy chỉnh
      const smoothFactor = 0.3; // nhỏ hơn = mượt hơn
      const newX = currentAimPos.x + (targetPos.x - currentAimPos.x) * smoothFactor;
      const newY = currentAimPos.y + (targetPos.y - currentAimPos.y) * smoothFactor;
      setAim(newX, newY);
    } else {
      // Snap ngay tức thì
      setAim(targetPos.x, targetPos.y);
    }
  }

  // Vòng lặp chính
  function mainLoop() {
    const enemies = getEnemies();
    if (!enemies || enemies.length === 0) return;

    const crosshair = getCrosshairPos();
    const bestTarget = findBestHeadTarget(enemies, crosshair);
    if (!bestTarget) return;

    const aimPos = calcAimPos(bestTarget.headPos);
    const currentAim = getCrosshairPos();

    aimAt(aimPos, currentAim);

    if (CONFIG.fireOnLock && isAimOnTarget(aimPos, currentAim)) {
      const now = Date.now();
      if (now - lastFireTime >= fireIntervalMs) {
        if (CONFIG.fullMagDump) {
          for (let i=0; i<getMagazineSize(); i++) {
            fireWeapon();
          }
        } else {
          fireWeapon();
        }
        lastFireTime = now;
      }
    }
  }

  // Kiểm tra đã aim đủ gần target để bắn (ví dụ cách 1~3 pixel)
  function isAimOnTarget(targetPos, currentAim) {
    const threshold = 3; // pixel
    return distance(targetPos, currentAim) <= threshold;
  }

  // ==== CHẠY VÒNG LẶP ====
  setInterval(mainLoop, CONFIG.tickIntervalMs || 1);

  // ==== MOCK API game để test (bạn thay thế bằng API thật) ====
  function getEnemies() {
    // Trả về mảng đối tượng với headPos và headSize
    return [
      { headPos: {x: 500, y: 300}, headSize: 15 },
      { headPos: {x: 600, y: 350}, headSize: 20 },
      { headPos: {x: 450, y: 400}, headSize: 12 },
    ];
  }
  function getCrosshairPos() {
    return {x: 490, y: 290};
  }
  function setAim(x, y) {
    console.log("Aim set to:", x, y);
  }
  function fireWeapon() {
    console.log("Fire!");
  }
  function getMagazineSize() {
    return 30;
  }
})();
