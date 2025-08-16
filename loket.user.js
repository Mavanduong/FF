document.addEventListener("DOMContentLoaded", () => {
    // Tạo nút chính
    const mainBtn = document.createElement("div");
    mainBtn.id = "assistive-touch";
    mainBtn.style.cssText = `
        position: fixed;
        bottom: 100px;
        right: 20px;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: rgba(0,0,0,0.6);
        color: #fff;
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: 20px;
        cursor: pointer;
        z-index: 9999;
        user-select: none;
    `;
    mainBtn.innerHTML = "☰";
    document.body.appendChild(mainBtn);

    // Tạo menu
    const menu = document.createElement("div");
    menu.id = "assistive-menu";
    menu.style.cssText = `
        position: fixed;
        bottom: 160px;
        right: 20px;
        display: none;
        flex-direction: column;
        gap: 10px;
        z-index: 9999;
    `;
    document.body.appendChild(menu);

    // Các nút trong menu
    const actions = [
        { label: "🏠 Home", onClick: () => alert("Home Clicked") },
        { label: "⬅️ Back", onClick: () => history.back() },
        { label: "🔄 Reload", onClick: () => location.reload() },
        { label: "🔊 Volume Up", onClick: () => alert("Volume Up") },
        { label: "🔇 Volume Down", onClick: () => alert("Volume Down") }
    ];

    actions.forEach(action => {
        const btn = document.createElement("button");
        btn.textContent = action.label;
        btn.style.cssText = `
            padding: 8px 12px;
            background: rgba(0,0,0,0.8);
            color: #fff;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
        `;
        btn.addEventListener("click", action.onClick);
        menu.appendChild(btn);
    });

    // Toggle menu
    let menuVisible = false;
    mainBtn.addEventListener("click", () => {
        menuVisible = !menuVisible;
        menu.style.display = menuVisible ? "flex" : "none";
    });

    // Kéo nút di chuyển
    let isDragging = false, offsetX = 0, offsetY = 0;
    mainBtn.addEventListener("mousedown", e => {
        isDragging = true;
        offsetX = e.clientX - mainBtn.offsetLeft;
        offsetY = e.clientY - mainBtn.offsetTop;
    });
    document.addEventListener("mousemove", e => {
        if (isDragging) {
            mainBtn.style.left = `${e.clientX - offsetX}px`;
            mainBtn.style.top = `${e.clientY - offsetY}px`;
            mainBtn.style.right = "auto";
            mainBtn.style.bottom = "auto";
            menu.style.bottom = `${parseInt(mainBtn.style.top) - 60}px`;
            menu.style.right = "auto";
            menu.style.left = mainBtn.style.left;
        }
    });
    document.addEventListener("mouseup", () => {
        isDragging = false;
    });
});
