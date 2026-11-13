class Door {
    constructor(pos, options) {
        this.game = undefined;
        options = {
            open: false,
            ...options,
        };
        this.options = options;
        this.pos = pos;
        this.id = Math.floor(Math.random() * 100000);
        this.nextLevel = options.nextLevel;
        this.open = options.open;
        this.prepped = options.players;
        this.playerCount = options.playerCount;
        this.lockedNoticeTimer = 0;
        this.transitionTriggered = false;

        this.onIn = (e) => {
            if (!e || !e.player) return;
            let player = e.player;
            if (player.dead) return;
            if (window.clientConnection && player.onlinePlayer) return;
            if (!this.trigger || !this.trigger.rect) return;

            let triggerPos = this.trigger.rect.position;
            let playerPos = player.body.position;
            let dx = Math.abs(playerPos.x - triggerPos.x);
            let dy = Math.abs(playerPos.y - triggerPos.y);

            // Generous door trigger zone
            if (dx < 60 && dy < 70) {
                let isPressingDown = player.keys && (player.keys[player.controls[3]] || player.keys["arrowdown"] || player.keys["s"]);

                if (!this.open) {
                    if (isPressingDown) {
                        this.lockedNoticeTimer = 60; // Triggers "🗝️ Key Required!" visual alert
                    }
                    return;
                }

                // As soon as anybody enters / leaves through the open door,
                // automatically advance to the next level immediately!
                if ((isPressingDown || dx < 35) && !this.transitionTriggered) {
                    this.transitionTriggered = true;
                    player.readyUp(triggerPos);

                    if (window.AudioEngine) AudioEngine.play("levelComplete");

                    if (!window.clientConnection) {
                        // Host or Local play
                        if (typeof setLevel === "function") {
                            setLevel(this.nextLevel);
                        } else if (player.game && player.game.renderer) {
                            player.game.renderer.levelTransistion(this.nextLevel);
                            if (window.hostConnection) {
                                hostConnection.broadcast(JSON.stringify({
                                    setLevel: this.nextLevel,
                                    currentLevel: this.nextLevel
                                }));
                            }
                        }
                    } else if (window.clientConnection && window.clientConnection.conn) {
                        // Client: request host to advance the level for everyone
                        try {
                            window.clientConnection.conn.send(JSON.stringify({
                                requestNextLevel: this.nextLevel
                            }));
                        } catch (err) {}
                    }
                }
            }
        };
    }
}