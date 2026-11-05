var keys = {}, preKeys = {};

document.addEventListener("keydown", (e) => {
    if (e.code == "F1" && window.mainGame && window.mainGame.renderer) {
        mainGame.renderer.debug = !mainGame.renderer.debug;
    }
    keys[e.key.toLowerCase()] = true;
});

document.addEventListener("keyup", (e) => {
    keys[e.key.toLowerCase()] = false;
});

function updateControls() {
    if (window.clientConnection && window.mainGame && window.mainGame.players && window.mainGame.players[0]) {
        let playerControls = mainGame.players[0].controls;
        var fu = (n) => {
            if (keys[playerControls[n]] && !preKeys[playerControls[n]]) {
                clientConnection.updateKey(playerControls[n], true);
            }
            if (!keys[playerControls[n]] && preKeys[playerControls[n]]) {
                clientConnection.updateKey(playerControls[n], false);
            }
        };

        fu(0);
        fu(1);
        fu(2);
        fu(3);
    }

    preKeys = { ...keys };
}

function setupOnScreenControls() {
    const btnLeft = document.getElementById("btnLeft");
    const btnRight = document.getElementById("btnRight");
    const btnJump = document.getElementById("btnJump");
    const btnDown = document.getElementById("btnDown");

    function attach(el, keyName) {
        if (!el) return;
        const press = (e) => {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            keys[keyName] = true;
            el.classList.add("touch-active");
        };
        const release = (e) => {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            keys[keyName] = false;
            el.classList.remove("touch-active");
        };

        el.addEventListener("touchstart", press, { passive: false });
        el.addEventListener("touchend", release, { passive: false });
        el.addEventListener("touchcancel", release, { passive: false });

        el.addEventListener("mousedown", press);
        el.addEventListener("mouseup", release);
        el.addEventListener("mouseleave", release);
    }

    attach(btnLeft, "arrowleft");
    attach(btnRight, "arrowright");
    attach(btnJump, "arrowup");
    attach(btnDown, "arrowdown");
}

function toggleTouchControls() {
    const ctrl = document.getElementById("onScreenControls");
    if (!ctrl) return;
    if (ctrl.style.display === "none" || !ctrl.style.display) {
        ctrl.style.display = "flex";
    } else {
        ctrl.style.display = "none";
    }
}
