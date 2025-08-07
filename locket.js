// ==UserScript==
// @name         FF_AutoAim_NoConsole_v1.0
// @version      1.0
// @description  Ghim đầu khi vuốt – Không console – Max lực hút
// ==/UserScript==

(() => {
  const aimSettings = {
    enabled: true,
    aimStrength: 9999,
    headOffset: { x: 0, y: -0.35 }, // Gần như ghim thẳng đầu
    prediction: true,
    autoCorrect: true,
  };

  function isEnemy(target) {
    return target && target.isVisible && target.type === 'enemy';
  }

  function aimToHead(player, enemy) {
    if (!aimSettings.enabled || !enemy) return;

    const dx = enemy.position.x - player.crosshair.x + aimSettings.headOffset.x;
    const dy = enemy.position.y - player.crosshair.y + aimSettings.headOffset.y;

    player.crosshair.x += dx / aimSettings.aimStrength;
    player.crosshair.y += dy / aimSettings.aimStrength;
  }

  function onSwipe(player, enemies) {
    const target = enemies.find(isEnemy);
    aimToHead(player, target);
  }

  const gameLoop = setInterval(() => {
    if (typeof game === 'undefined' || !game.player || !game.enemies) return;

    if (game.player.input.isSwiping) {
      onSwipe(game.player, game.enemies);
    }
  }, 10);
})();
