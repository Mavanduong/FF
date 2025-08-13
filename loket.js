// ==UserScript==
// @name         AutoHeadlockProMax v15.0-NoEscape-GodMode
// @version      15.0
// @description  God-level headshot lock: AI Head Turn Prediction, Magnetic Lock, Wall Avoidance, Multi-Bullet Tracking, Danger Priority, Human Swipe Override, Auto Fire, Lag Compensation, Magnetic Beam
// @match        *://*/*
// @run-at       document-start
// ==/UserScript==

(() => {
    /* ================= CONFIG ================= */
    const CONFIG = {
        aimFov: 75,                // Góc FOV lock (độ)
        predictionTime: 0.15,      // Dự đoán hướng đầu (giây)
        stickinessPx: 3,           // Khoảng cách px để kích hoạt Magnetic Lock
        wallOffsetPx: 6,           // Dịch aim khi có vật cản
        recoilCompFactor: 0.85,    // Hệ số bù giật
        dangerSwitchDelay: 0.05,   // Thời gian đổi target khi có mối nguy
        humanSwipeAssist: 0.2,     // % khoảng cách còn lại AI sẽ hoàn tất
        preFireLeadTime: 0.08,     // Thời gian bắn đón (giây)
        lagCompFactor: 1.0,        // Hệ số bù ping
        beamSmoothFactor: 0.12,    // Độ mượt beam mode
        debug: false               // Bật console debug
    };

    /* ================= CORE STATE ================= */
    let currentTarget = null;
    let lastShotTime = 0;
    let ping = 0; // sẽ được cập nhật runtime

    /* ================== MODULES ================== */

    /** 1. AI Head Turn Prediction 2D + 3D */
    function predictHeadPosition(enemy) {
        const velocity = enemy.velocity;
        const viewDir = enemy.viewDir;
        const predictedPos = {
            x: enemy.headPos.x + (velocity.x + viewDir.x) * CONFIG.predictionTime,
            y: enemy.headPos.y + (velocity.y + viewDir.y) * CONFIG.predictionTime,
            z: enemy.headPos.z + (velocity.z + viewDir.z) * CONFIG.predictionTime
        };
        return predictedPos;
    }

    /** 2. Quantum Stickiness (Magnetic Lock) */
    function applyMagneticLock(aimPos, headPos) {
        const dx = aimPos.x - headPos.x;
        const dy = aimPos.y - headPos.y;
        const dz = aimPos.z - headPos.z;
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        return (dist <= CONFIG.stickinessPx) ? headPos : aimPos;
    }

    /** 3. Wall Avoidance Auto-Offset */
    function applyWallAvoidance(startPos, targetPos) {
        if (raycastHasObstacle(startPos, targetPos)) {
            return {
                x: targetPos.x + CONFIG.wallOffsetPx,
                y: targetPos.y,
                z: targetPos.z
            };
        }
        return targetPos;
    }

    /** 4. Multi-Bullet Burst Tracking */
    function burstTrack(weapon, bulletIndex, headPos) {
        const spread = weapon.spreadPattern[bulletIndex] || {x:0, y:0, z:0};
        return {
            x: headPos.x - spread.x * CONFIG.recoilCompFactor,
            y: headPos.y - spread.y * CONFIG.recoilCompFactor,
            z: headPos.z - spread.z * CONFIG.recoilCompFactor
        };
    }

    /** 5. Danger Priority AI */
    function selectDangerTarget(enemies) {
        return enemies.sort((a, b) => {
            const scoreA = (a.isAimingAtYou ? 2 : 0) - distanceToPlayer(a);
            const scoreB = (b.isAimingAtYou ? 2 : 0) - distanceToPlayer(b);
            return scoreB - scoreA;
        })[0] || null;
    }

    /** 6. Human Swipe Override */
    function assistSwipe(currentAim, targetAim) {
        const dx = targetAim.x - currentAim.x;
        const dy = targetAim.y - currentAim.y;
        const dz = targetAim.z - currentAim.z;
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        if (dist / CONFIG.stickinessPx <= CONFIG.humanSwipeAssist) {
            return targetAim;
        }
        return currentAim;
    }

    /** 7. Auto Fire Logic v3 */
    function shouldAutoFire(player, enemy) {
        const predicted = predictHeadPosition(enemy);
        return willCrosshairAlign(player.aimPos, predicted, CONFIG.preFireLeadTime);
    }

    /** 8. Lag Compensation */
    function applyLagCompensation(headPos) {
        const lagAdjust = ping / 1000 * CONFIG.lagCompFactor;
        return {
            x: headPos.x + headPos.vx * lagAdjust,
            y: headPos.y + headPos.vy * lagAdjust,
            z: headPos.z + headPos.vz * lagAdjust
        };
    }

    /** 9. Crosshair Magnetic Beam Mode */
    function smoothAim(currentAim, targetAim) {
        return {
            x: currentAim.x + (targetAim.x - currentAim.x) * CONFIG.beamSmoothFactor,
            y: currentAim.y + (targetAim.y - currentAim.y) * CONFIG.beamSmoothFactor,
            z: currentAim.z + (targetAim.z - currentAim.z) * CONFIG.beamSmoothFactor
        };
    }

    /* ================= GAME LOOP ================= */
    game.on('tick', () => {
        const enemies = game.getEnemiesInFov(CONFIG.aimFov);
        if (!enemies.length) return;

        // Danger Priority
        const target = selectDangerTarget(enemies);
        if (!target) return;
        currentTarget = target;

        // Predict head movement
        let headPos = predictHeadPosition(target);

        // Lag Compensation
        headPos = applyLagCompensation(headPos);

        // Wall Avoidance
        headPos = applyWallAvoidance(player.eyePos, headPos);

        // Magnetic Lock
        headPos = applyMagneticLock(player.aimPos, headPos);

        // Human Swipe Assist
        headPos = assistSwipe(player.aimPos, headPos);

        // Beam smoothing
        const smoothPos = smoothAim(player.aimPos, headPos);

        // Apply aim
        player.setAim(smoothPos);

        // Auto fire
        if (shouldAutoFire(player, target)) {
            player.fire();
        }
    });

    /* ============ HELPER FUNCTIONS ============ */
    function raycastHasObstacle(start, end) {
        // Placeholder – replace with real raycast
        return false;
    }

    function distanceToPlayer(enemy) {
        const dx = enemy.pos.x - player.pos.x;
        const dy = enemy.pos.y - player.pos.y;
        const dz = enemy.pos.z - player.pos.z;
        return Math.sqrt(dx*dx + dy*dy + dz*dz);
    }

    function willCrosshairAlign(currentAim, targetAim, time) {
        const futureAim = {
            x: currentAim.x + (targetAim.x - currentAim.x) * time,
            y: currentAim.y + (targetAim.y - currentAim.y) * time,
            z: currentAim.z + (targetAim.z - currentAim.z) * time
        };
        return distanceVec(futureAim, targetAim) < CONFIG.stickinessPx;
    }

    function distanceVec(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = a.z - b.z;
        return Math.sqrt(dx*dx + dy*dy + dz*dz);
    }
})();
