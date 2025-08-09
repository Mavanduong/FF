function getBodyPos(enemy) {
  if (!enemy) return null;
  if (typeof enemy.getBone === 'function') return enemy.getBone('body') || enemy.getBone('chest');
  return enemy.body || null;
}

function getLegsPos(enemy) {
  if (!enemy) return null;
  if (typeof enemy.getBone === 'function') return enemy.getBone('legs') || enemy.getBone('foot');
  return enemy.legs || null;
}

// Tính khoảng cách 2D giữa 2 điểm (x,y)
function dist2D(a, b) {
  if (!a || !b) return Infinity;
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Chỉ vuốt về đầu, bỏ qua thân và chân tuyệt đối
function aimAtHead(enemy) {
  const current = crosshairPos();
  const head = getHeadPos(enemy);
  const body = getBodyPos(enemy);
  const legs = getLegsPos(enemy);
  if (!head) return;

  // Lấy vị trí đầu đã bù calibration
  const predictedHead = {
    x: head.x + STATE.calibrationOffset.x,
    y: head.y + STATE.calibrationOffset.y,
    z: head.z || 0
  };

  // Khoảng cách crosshair tới từng điểm
  const distHead = dist2D(current, predictedHead);
  const distBody = dist2D(current, body);
  const distLegs = dist2D(current, legs);

  // Nếu crosshair đang gần thân hoặc chân hơn đầu thì bỏ qua, giữ nguyên tâm
  if ((distBody < distHead && distBody < distLegs) || (distLegs < distHead && distLegs < distBody)) {
    return current; // Không vuốt, giữ nguyên tâm để không lệch về thân/chân
  }

  // Nếu crosshair gần đầu hoặc xa quá thì vuốt về đầu
  return clampAimMove(current, predictedHead);
}
