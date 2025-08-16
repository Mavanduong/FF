// req_keepalive.js — dùng cho http-request (Shadowrocket/Surge style)
(() => {
  try {
    if (!$request) { $done(); return; }

    const headers = $request.headers || {};

    // Giữ kết nối lâu hơn, tránh handshake lặp → ping ổn định hơn
    headers["Connection"] = "keep-alive";
    headers["Keep-Alive"] = "timeout=60, max=1000";

    // API không nên cache từ CDN
    headers["Cache-Control"] = "no-cache";
    headers["Pragma"] = "no-cache";

    // Đính timestamp để bạn dễ đo RTT trong log
    headers["X-GameBoost-Timestamp"] = String(Date.now());

    // Một số game thích Accept-Language/Encoding gọn nhẹ
    if (!headers["Accept-Encoding"]) headers["Accept-Encoding"] = "gzip, deflate";

    $done({ headers });
  } catch (e) {
    $done({});
  }
})();
