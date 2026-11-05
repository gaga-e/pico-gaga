function startGame() {
    document.getElementById("c").style.display = "";
    document.getElementById("menu").style.display = "none";
    document.body.classList.add("in-game");

    var restartWrap = document.getElementById("restartLevelWrap");
    if (restartWrap) restartWrap.style.display = "";
    
    var restartBtn = document.getElementById("restartLevel");
    if (restartBtn) restartBtn.style.display = "";

    // Touch controls: only shown on mobile/touch screens, completely hidden on desktop
    var touchControls = document.getElementById("onScreenControls");
    const isMobile = window.innerWidth <= 900 || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    if (touchControls) {
        touchControls.style.display = isMobile ? "flex" : "none";
    }

    if (!mainGame.matter.running) {
        startMainGame();
        setInterval(() => {
            if (window.hostConnection) {
                hostConnection.broadcast(JSON.stringify({
                    startGame: true,
                }));
            }
        }, 3000);
    }
}

function hideGame() {
    document.getElementById("menu").style.display = "";
    document.getElementById("c").style.display = "none";
    document.body.classList.remove("in-game");
    var touchControls = document.getElementById("onScreenControls");
    if (touchControls) touchControls.style.display = "none";
}

function setRoomCode(c) {
    var el = document.getElementById("roomCode");
    if (el) el.textContent = c;
}

function addPlayerToMenu(name) {
    var list = document.getElementById("memberlist");
    if (list && typeof createElementFromHTML === "function") {
        list.appendChild(createElementFromHTML(`<div>${name}<br></div>`));
    }
}
