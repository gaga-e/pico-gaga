class Host {
    constructor(game) {
        this.game = game;
        this.connections = [];
        
        // Generate random 4-letter room code
        let wordsf = (typeof words !== "undefined" && words.length) 
            ? words.filter(a => a.length === 4) 
            : ["PARK", "PICO", "CATZ", "JUMP", "PLAY", "STAR", "GAME"];
        this.code = wordsf[Math.floor(Math.random() * wordsf.length)].toUpperCase();
        this.peerId = "picopark-" + this.code;
        this.peer = null;
        this.opened = false;
    }

    init() {
        console.log("Initializing Host with ID:", this.peerId);
        
        // Create Peer with public PeerJS cloud broker
        this.peer = new Peer(this.peerId, {
            debug: 1,
            config: ICE_CONFIG
        });

        this.peer.on("open", (id) => {
            console.log("Host room opened successfully! Room Code:", this.code);
            this.opened = true;
            if (typeof setRoomCode === "function") {
                setRoomCode(this.code);
            }
            const incomingEl = document.getElementById("incoming");
            if (incomingEl) incomingEl.textContent = " (Ready for players)";
        });

        this.peer.on("error", (err) => {
            console.warn("Host peer notice:", err);
            if (err.type === "unavailable-id") {
                // If the word was recently taken on PeerJS, pick a unique code
                this.code = Math.random().toString(36).substring(2, 6).toUpperCase();
                this.peerId = "picopark-" + this.code;
                console.log("Retrying with new code:", this.code);
                this.init();
            }
        });

        this.peer.on("disconnected", () => {
            console.warn("Host lost signaling server, reconnecting...");
            if (this.peer && !this.peer.destroyed) this.peer.reconnect();
        });

        this.peer.on("connection", (conn) => {
            console.log("Client connecting:", conn.peer);
            this.handleNewClient(conn);
        });
    }

    handleNewClient(conn) {
        const incomingEl = document.getElementById("incoming");
        if (incomingEl) incomingEl.textContent = " (Player joining...)";

        conn.on("open", () => {
            console.log("Client data channel open:", conn.peer);
            if (incomingEl) incomingEl.textContent = "";

            // Create player body for this client
            const playerColor = this.game.fetchColor();
            const clientPlayer = this.game.playerhandler.addPlayer({
                color: playerColor,
                controls: ["arrowleft", "arrowright", "arrowup", "arrowdown"],
                keys: {}
            });
            clientPlayer.onlinePlayer = true;
            clientPlayer.conn = conn;
            conn.player = clientPlayer;
            this.connections.push(conn);

            // Send initial setup to client
            conn.send(JSON.stringify({
                setColor: playerColor,
                playerId: clientPlayer.body.id,
                currentLevel: this.game.levelHandler.currentLevel.name || "one"
            }));

            // Handle incoming data from client
            conn.on("data", (raw) => {
                try {
                    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
                    if (data.setUsername) {
                        conn.clientUsername = data.setUsername;
                        if (typeof addPlayerToMenu === "function") {
                            addPlayerToMenu(data.setUsername);
                        }
                    }
                    if (data.player && conn.player) {
                        setPlayerWithData(conn.player, data.player);
                    }
                } catch (e) {
                    console.error("Error processing client data:", e);
                }
            });

            conn.on("close", () => {
                console.log("Client disconnected:", conn.peer);
                if (conn.player) {
                    conn.player.unload();
                }
                const idx = this.connections.indexOf(conn);
                if (idx !== -1) this.connections.splice(idx, 1);
            });

            conn.on("error", (err) => {
                console.error("Client conn error:", err);
            });
        });
    }

    broadcast(data) {
        const payload = typeof data === "string" ? data : JSON.stringify(data);
        for (let i = 0; i < this.connections.length; i++) {
            const conn = this.connections[i];
            if (conn && conn.open) {
                try {
                    conn.send(payload);
                } catch (e) {
                    console.error("Broadcast send error:", e);
                }
            }
        }
    }

    updateClients() {
        if (!this.connections.length) return;
        
        const payload = JSON.stringify({
            playerData: this.getPlayersData(),
            syncData: (this.game.syncHandler) ? this.game.syncHandler.getSyncData() : null
        });

        for (let i = 0; i < this.connections.length; i++) {
            const conn = this.connections[i];
            if (conn && conn.open) {
                try {
                    conn.send(payload);
                } catch (e) {}
            }
        }
    }

    getPlayersData() {
        const data = [];
        for (let i = 0; i < this.game.players.length; i++) {
            data.push(parsePlayerData(this.game.players[i]));
        }
        return data;
    }
}
