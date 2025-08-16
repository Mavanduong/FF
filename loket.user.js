// ==UserScript==
// @name         AutoHeadlock-Test
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Tự động aim vào đầu địch (test version)
// @author       You
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Hàm lấy danh sách enemy (giả lập hoặc hook từ game)
    function getEnemies() {
        if (window.game && typeof game.getEnemies === 'function') {
            return game.getEnemies(); // Nếu game có API này
        }
        return []; // Không có gì thì trả rỗng
    }

    // Hàm lấy vị trí đầu của enemy
    function getHeadPos(enemy) {
        return enemy?.head || { x: 0, y: 0 };
    }

    // Hàm di chuyển tâm ngắm lên đầu
    function moveCrosshair(x, y) {
        const canvas = document.querySelector('canvas');
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const event = new MouseEvent('mousemove', {
            clientX: rect.left + x,
            clientY: rect.top + y,
            bubbles: true
        });
        canvas.dispatchEvent(event);
    }
  function shoot() {
    const e = new KeyboardEvent('keydown', { key: 'Mouse1', bubbles: true });
    document.dispatchEvent(e);
}


    // Tick loop (liên tục kiểm tra và aim)
    function tick() {
        try {
            const enemies = getEnemies();
            if (!enemies.length) return;

            // Chọn enemy gần nhất
            const target = enemies[0];
            if (!target) return;

            const head = getHeadPos(target);
            moveCrosshair(head.x, head.y);
        } catch (e) {
            console.error('AutoHeadlock error:', e);
        }
    }

    // Chạy liên tục
    setInterval(tick, 16); // 60 FPS
})();
