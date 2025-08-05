// ==UserScript==
// @name         📦 Shadowrocket API Logger
// @version      1.0.0
// @description  Ghi log response JSON từ API game để tìm thông tin ghim đầu
// @match        *://*/*
// @script-response-body
// ==/UserScript==

try {
  if (!$response || !$response.body) {
    $done({});
    return;
  }

  const url = $request.url;
  const contentType = $response.headers["Content-Type"] || "";

  if (contentType.includes("application/json")) {
    const json = JSON.parse($response.body);

    // ⚠️ Bạn có thể lọc URL cụ thể nếu cần
    if (url.includes("/enemy") || url.includes("/match") || url.includes("/fire") || url.includes("/player")) {
      console.log("📦 [API LOG] URL:", url);
      console.log("📄 JSON:", JSON.stringify(json, null, 2));
    }
  }

  $done({});
} catch (err) {
  console.log("❌ Script Error:", err);
  $done({});
}
