// ==UserScript==
// @name         AutoClick Test
// @version      1.0
// @description  Tự động click một nút trên trang web
// @match        *://*/*
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // Chọn nút cần click (ví dụ nút có id="myButton")
    const button = document.querySelector('#myButton');

    if(!button) return;

    // Tự động click mỗi 1 giây
    setInterval(() => {
        button.click();
        console.log('AutoClick fired!');
    }, 1000); // 1000ms = 1 giây
})();
