function startGame() {
    document.getElementById("c").style.display = "";
    document.getElementById("menu").style.display = "none";
    document.body.classList.add("in-game");

    var restartBtn = document.getElementById("restartLevelBtn");
    if (restartBtn) {
        restartBtn.style.display = (typeof urlData !== "undefined" && urlData.join) ? "none" : "flex";
    }

    // Touch controls: shown on mobile/touch screens, toggleable via joystick button on desktop
    var touchControls = document.getElementById("onScreenControls");
    const isTouch = window.innerWidth <= 900 || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    if (touchControls) {
        touchControls.style.display = isTouch ? "flex" : "none";
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
