class Client {
    constructor(game, player) {
        this.game = game;
        this.mainPlayer = player;
        this.mainPlayer.onlinePlayer = false; // We control this player locally
        
        this.peer = null;
        this.conn = null;
        this.connected = false;

        let name = localStorage.getItem("username");
        name = name || "Player";
        this.username = name;
    }

    init(roomCode) {
        roomCode = (roomCode || "").trim().toUpperCase();
        const targetPeerId = "picopark-" + roomCode;
        console.log("Client connecting to room:", roomCode, "Target ID:", targetPeerId);

        const joinEl = document.getElementById("join");
        if (joinEl) {
            joinEl.innerHTML = `Connecting to room <b>${roomCode}</b>...`;
        }

        this.peer = new Peer({
            debug: 1,
            config: ICE_CONFIG
        });

        this.peer.on("open", (id) => {
            console.log("Client local peer created:", id);
            this.conn = this.peer.connect(targetPeerId, { reliable: true });

            // Surface a clear error instead of hanging on "Connecting..." forever
            this.connectTimer = setTimeout(() => {
                if (!this.connected && joinEl) {
                    joinEl.innerHTML = `<span style="color:#f87171">Couldn't reach room <b>${roomCode}</b>.</span><br>` +
                        `Check the code, make sure the host is still on the lobby screen, then <a href="javascript:location.reload()" style="color:#4ade80">retry</a>.`;
                }
            }, 20000);

            this.conn.on("open", () => {
                console.log("Connected directly to Host!");
                this.connected = true;
                clearTimeout(this.connectTimer);
                if (joinEl) {
                    joinEl.innerHTML = `Connected to room <b>${roomCode}</b>!<br><br>Waiting for host to start game...`;
                }

                // Send our username to host
                this.conn.send(JSON.stringify({
                    setUsername: this.username
                }));
            });

            this.conn.on("data", (raw) => {
                try {
                    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
                    this.processData(data);
                } catch (e) {
                    console.error("Error processing host data:", e);
                }
            });

            this.conn.on("close", () => {
                console.warn("Connection to host closed");
                this.connected = false;
                if (joinEl) {
                    joinEl.innerHTML = `<span style="color:red">Disconnected from host room.</span> <a href="./index.html">Back to Home</a>`;
                }
            });

            this.conn.on("error", (err) => {
                console.error("Connection error:", err);
            });
        });

        this.peer.on("error", (err) => {
            console.error("PeerJS error:", err);
            if (joinEl) {
                joinEl.innerHTML = `<span style="color:red">Could not connect to room "${roomCode}". Make sure the host has the room open!</span><br><br><a href="./index.html">Back to Home</a>`;
            }
        });
    }

    processData(d) {
        if (d.setColor) {
            this.mainPlayer.color = d.setColor;
        }
        if (d.playerId) {
            this.mainPlayer.body.id = d.playerId;
        }
        if (d.startGame) {
            startGame();
        }
        if (d.setLevel) {
            this.game.renderer.levelTransistion(d.setLevel);
        }
        if (d.restartLevel) {
            this.game.levelHandler.setLevel(mainGame.levelHandler.currentLevel.name);
        }
        if (d.playerData) {
            this.updateHostPlayers(d.playerData);
        }
        if (d.syncData && mainGame.running) {
            this.game.syncHandler.processSyncData(d.syncData);
        }
    }

    updateHost() {
        if (this.conn && this.conn.open) {
            try {
                this.conn.send(JSON.stringify({
                    player: parsePlayerData(this.mainPlayer)
                }));
            } catch (e) {}
        }
    }

    updateHostPlayers(players) {
        const findPlayerById = (id) => {
            for (let i = 0; i < this.game.players.length; i++) {
                if (this.game.players[i].body.id === id) return this.game.players[i];
            }
            return null;
        };

        for (let i = 0; i < players.length; i++) {
            const pData = players[i];
            if (pData.id === this.mainPlayer.body.id) continue;

            let found = findPlayerById(pData.id);
            if (!found) {
                found = mainGame.playerhandler.addPlayer({
                    bodyOptions: { id: pData.id },
                    color: pData.color
                });
                found.onlinePlayer = true;
            }
            setPlayerWithData(found, pData);
        }
    }
}
