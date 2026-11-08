var keys = {}, preKeys = {};

document.addEventListener("keydown", (e) => {
    if (e.code == "F1" && window.mainGame && window.mainGame.renderer) {
        mainGame.renderer.debug = !mainGame.renderer.debug;
    }
    const k = e.key.toLowerCase();
    keys[k] = true;
    if (k === "w") keys["arrowup"] = true;
    if (k === "a") keys["arrowleft"] = true;
    if (k === "s") keys["arrowdown"] = true;
    if (k === "d") keys["arrowright"] = true;
});

document.addEventListener("keyup", (e) => {
    const k = e.key.toLowerCase();
    keys[k] = false;
    if (k === "w") keys["arrowup"] = false;
    if (k === "a") keys["arrowleft"] = false;
    if (k === "s") keys["arrowdown"] = false;
    if (k === "d") keys["arrowright"] = false;
});

// Release all keys on window blur / tab switch to prevent permanently stuck running
window.addEventListener("blur", () => {
    for (let k in keys) {
        keys[k] = false;
    }
    const btns = document.querySelectorAll(".console-btn");
    btns.forEach(b => b.classList.remove("touch-active"));
});

function updateControls() {
    if (window.mainGame && window.mainGame.players && window.mainGame.players[0]) {
        mainGame.players[0].keys = { ...keys };
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
    const isHidden = window.getComputedStyle(ctrl).display === "none";
    ctrl.style.display = isHidden ? "flex" : "none";
}
