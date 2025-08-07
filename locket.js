// ==UserScript==
// @name         GhostSwipeLock iOS v2.1 – Simulated Ping 200ms
// @version      2.1
// @description  Giả lập ping 200ms: delay xử lý ghim đầu – không thay đổi ping thật – ổn định cho test hành vi người
// ==/UserScript==

const config = {
  lockDistance: 130,
  swipeAssist: true,
  autoHeadSnap: true,
  headRadius: 0.3,
  assistForce: 0.99995,
  dragThreshold: 0.18,
  simulatedPingMs: 200, // ✅ delay xử lý như ping thật
  aiPredictionMs: 80,
  priorityMovingEnemy: true,
};

function getEnemyHeads(apiData) {
  if (!apiData || !apiData.enemies) return [];
  return apiData.enemies.map(e => ({
    id: e.id,
    x: e.head.x + (e.velocityX || 0) * config.aiPredictionMs / 1000,
    y: e.head.y + (e.velocityY || 0) * config.aiPredictionMs / 1000,
    z: e.head.z + (e.velocityZ || 0) * config.aiPredictionMs / 1000,
    speed: e.velocity || 0,
    visible: e.visible !== false
  })).filter(e => e.visible);
}

function isUserDragging(input) {
  return input && input.swipe && input.swipe.length > 0;
}

function lockToHead(cursor, head) {
  const dx = head.x - cursor.x;
  const dy = head.y - cursor.y;
  const dz = head.z - cursor.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (dist < config.lockDistance) {
    cursor.x += dx * config.assistForce;
    cursor.y += dy * config.assistForce;
    cursor.z += dz * config.assistForce;
  }
  return cursor;
}

function onGameTick(apiData, inputState, cursor) {
  if (!isUserDragging(inputState)) return cursor;

  const heads = getEnemyHeads(apiData);
  const prioritized = config.priorityMovingEnemy
    ? heads.sort((a, b) => b.speed - a.speed)
    : heads;

  for (const head of prioritized) {
    const dx = head.x - cursor.x;
    const dy = head.y - cursor.y;
    const dz = head.z - cursor.z;
    const error = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (error < config.dragThreshold) {
      setTimeout(() => {
        const locked = lockToHead(cursor, head);
        updateCursor(locked);
      }, config.simulatedPingMs); // ⏱️ delay đúng 200ms như ping cao
      break;
    }
  }

  return cursor;
}

setInterval(() => {
  const api = getLatestGameAPI();
  const input = getTouchOrSwipe();
  const cursor = getCursor();
  const updated = onGameTick(api, input, cursor);
  updateCursor(updated);
}, 10);
