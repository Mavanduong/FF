// cdn_cache.js — dùng cho http-response (Shadowrocket/Surge style)
(() => {
  try {
    if (!$response) { $done(); return; }

    const url = ($request && $request.url) || "";
    const headers = $response.headers || {};
    const body = $response.body;

    // Chỉ áp dụng cho asset tĩnh
    const staticRe = /\.(png|jpg|jpeg|webp|gif|mp3|aac|wav|ogg|mp4|webm|bundle|obb|pak|zip|json|txt|bin|pakchunk|uasset|umap)(\?.*)?$/i;
    if (!staticRe.test(url)) { $done({}); return; }

    // Cho cache dài để hạn chế tải lại (đặc biệt map/texture)
    headers["Cache-Control"] = "public, max-age=604800, immutable"; // 7 ngày
    headers["X-GameBoost-CDN-Cache"] = "enabled";

    // Giữ ETag/Last-Modified nếu server đã set (đừng xóa)
    $done({ headers, body });
  } catch (e) {
    $done({});
  }
})();
