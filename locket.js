// ==UserScript==
// @name         GhostSwipeLock iOS v1.0
// @version      1.0
// @description  Ghim đầu mọi viên khi vuốt, tự lock nếu kéo gần đầu – không log – không e-aim từng viên
// ==/UserScript==

const config = {
  lockDistance: 120, // phạm vi phát hiện
  swipeAssist: true,
  autoHeadSnap: true,
  headRadius: 0.28,
  assistForce: 0.9999,
  dragThreshold: 0.15, // độ lệch tối đa khi người chơi kéo
  fakeNaturalDelay: 6, // ms delay phản ứng như người
};

function getEnemyHeadFromAPI(apiData) {
  if (!apiData || !apiData.enemies) return [];
  return apiData.enemies.map(e => ({
    id: e.id,
    x: e.head.x,
    y: e.head.y,
    z: e.head.z,
    moving: e.velocity > 0.5
  }));
}

function isUserDragging(inputState) {
  return inputState.swipe.length > 0;
}

function applyAutoSwipeLock(cursor, head, config) {
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

function onGameTick(apiData, inputState, currentCursor) {
  const heads = getEnemyHeadFromAPI(apiData);
  if (!isUserDragging(inputState)) return currentCursor;

  for (const head of heads) {
    const dx = Math.abs(head.x - currentCursor.x);
    const dy = Math.abs(head.y - currentCursor.y);
    const dz = Math.abs(head.z - currentCursor.z);
    const error = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (error <= config.dragThreshold) {
      // Giả lập vuốt nhẹ hỗ trợ
      setTimeout(() => {
        currentCursor = applyAutoSwipeLock(currentCursor, head, config);
      }, config.fakeNaturalDelay);
    }
  }
  return currentCursor;
}

// Tick loop cho Shadowrocket / Scriptable
setInterval(() => {
  const apiData = getLatestGameAPI();  // giả lập hàm hook API
  const input = getTouchOrSwipe();     // giả lập input
  const currentCursor = getCursor();   // tọa độ tâm hiện tại
  const updatedCursor = onGameTick(apiData, input, currentCursor);
  updateCursor(updatedCursor);         // cập nhật lại tâm
}, 10);
