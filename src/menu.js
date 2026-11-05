function startGame() {
    document.getElementById("c").style.display = "";
    document.getElementById("menu").style.display = "none";
    
    var restartWrap = document.getElementById("restartLevelWrap");
    if (restartWrap) restartWrap.style.display = "";
    
    var restartBtn = document.getElementById("restartLevel");
    if (restartBtn) restartBtn.style.display = "";

    // Show touch controls on mobile or automatically when game starts
    var touchControls = document.getElementById("onScreenControls");
    if (touchControls) {
        touchControls.style.display = "flex";
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
