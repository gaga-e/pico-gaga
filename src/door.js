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

        this.onIn = (e) => {
            if (!e || !e.player) return;
            let player = e.player;
            if (!this.trigger || !this.trigger.rect) return;

            let triggerPos = this.trigger.rect.position;
            let playerPos = player.body.position;
            let dx = Math.abs(playerPos.x - triggerPos.x);
            let dy = Math.abs(playerPos.y - triggerPos.y);

            // Generous door trigger zone so all players standing in front can enter
            if (dx < 60 && dy < 70) {
                let isPressingDown = player.keys && (player.keys[player.controls[3]] || player.keys["arrowdown"] || player.keys["s"]);

                if (!this.open) {
                    if (isPressingDown) {
                        this.lockedNoticeTimer = 60; // Triggers "🗝️ Key Required!" visual alert
                    }
                    return;
                }

                player.exitTimer -= (player.game ? player.game.deltaTime : 1);
                if (isPressingDown && !player.ready) {
                    player.readyUp(triggerPos);
                    let activePlayers = this.game.players.filter(p => !p.dead);
                    let playerReadyCount = 0;
                    activePlayers.forEach(p => {
                        if (p.ready) playerReadyCount += 1;
                    });
                    let neededCount = activePlayers.length || this.playerCount || 1;
                    if (playerReadyCount >= neededCount && !window.clientConnection) {
                        player.game.renderer.levelTransistion(this.nextLevel);
                        if (window.hostConnection) {
                            hostConnection.broadcast(JSON.stringify({
                                setLevel: this.nextLevel,
                            }));
                        }
                    }
                }
            }
        };
    }
}
