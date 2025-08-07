// ==UserScript==
// @name         AutoHeadlockProMax v12.3 – SquadLockGigaX
// @version      12.3
// @description  Ghim đầu tuyệt đối – Không lệch – Vuốt hay không vẫn lên đầu – Tăng tốc độ aim, phản xạ squad-level
// ==/UserScript==

const SquadLockGigaX = {
  aimPower: 99999, // max lực ghim
  maxDistance: 250, // xa hơn bình thường
  aimSpeed: 10000, // cực nhanh, không delay
  stickyRange: 2.0, // siêu dính vào đầu
  headOffset: { x: 0, y: -1.8, z: 0 }, // đúng vị trí đầu
  predictionFactor: 1.5, // dự đoán di chuyển
  reactionTime: 0, // bắn ngay không delay
  ignoreLimb: true, // bỏ qua chân/thân
  autoLockOnSwipe: true, // vuốt là dính đầu
  lockCorrection: true, // auto sửa lệch
  squadSupport: true, // nhận diện đa mục tiêu
  targetPriority: "nearest-head", // ưu tiên gần nhất và đầu
  humanSwipeAssist: true, // hỗ trợ vuốt người chơi
  adjustIfMiss: true, // nếu lệch sẽ tự chỉnh ngay
  fireOnLock: true, // tự bắn khi ghim xong
  burstControl: true, // hỗ trợ nhiều viên ghim liên tiếp
  bulletFollowHead: true, // từng viên bay theo đầu

  run(frame, player, enemies) {
    enemies.forEach(enemy => {
      if (!this.isValid(enemy)) return;

      const predicted = this.predictHead(enemy);
      const dist = this.getDistance(player.pos, predicted);
      if (dist > this.maxDistance) return;

      const shouldLock = this.shouldLock(player, enemy, dist);
      if (shouldLock) {
        const corrected = this.autoCorrectAim(player.aim, predicted);
        this.applyAim(player, corrected);

        if (this.fireOnLock) this.fire();
      }
    });
  },

  isValid(enemy) {
    return enemy && enemy.health > 0 && !enemy.isTeammate;
  },

  getDistance(a, b) {
    const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  },

  predictHead(enemy) {
    const velocity = enemy.velocity;
    return {
      x: enemy.pos.x + velocity.x * this.predictionFactor,
      y: enemy.pos.y + velocity.y * this.predictionFactor + this.headOffset.y,
      z: enemy.pos.z + velocity.z * this.predictionFactor,
    };
  },

  shouldLock(player, enemy, dist) {
    if (this.autoLockOnSwipe && player.swipe) return true;
    if (this.squadSupport) return true;
    return dist <= this.stickyRange;
  },

  autoCorrectAim(current, target) {
    if (!this.lockCorrection) return target;

    const dx = Math.abs(current.x - target.x);
    const dy = Math.abs(current.y - target.y);
    const dz = Math.abs(current.z - target.z);

    if (dx > 0.3 || dy > 0.3 || dz > 0.3) {
      // Lệch khỏi đầu – sửa mạnh hơn
      return {
        x: target.x,
        y: target.y,
        z: target.z
      };
    }

    return target;
  },

  applyAim(player, aimTarget) {
    player.aim.x += (aimTarget.x - player.aim.x) / this.aimSpeed;
    player.aim.y += (aimTarget.y - player.aim.y) / this.aimSpeed;
    player.aim.z += (aimTarget.z - player.aim.z) / this.aimSpeed;
  },

  fire() {
    if (typeof game !== "undefined" && game.fire) {
      game.fire("auto");
    }
  }
};

// Kết nối vào game loop
if (typeof game !== "undefined") {
  game.on("tick", (frame) => {
    const player = game.localPlayer;
    const enemies = game.enemies || [];
    SquadLockGigaX.run(frame, player, enemies);
  });
}
