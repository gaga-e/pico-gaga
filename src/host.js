class Host {
    constructor(game) {
        this.game = game;
        this.connections = [];
        
        // 4-character alphanumeric room code [A-Z0-9]{4}
        let customCode = (typeof urlData !== "undefined" && urlData.host && urlData.host !== "true") 
            ? String(urlData.host).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4) 
            : "";
        if (!customCode || customCode.length !== 4) {
            const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
            customCode = "";
            for (let i = 0; i < 4; i++) {
                customCode += chars.charAt(Math.floor(Math.random() * chars.length));
            }
        }
        this.code = customCode;
        this.pin = (typeof urlData !== "undefined" && urlData.pin) 
            ? String(urlData.pin).replace(/[^A-Z0-9]/gi, "").slice(0, 4) 
            : "";
        this.peerId = "picopark-" + this.code + (this.pin ? ("-" + this.pin) : "");
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
            console.log("Host room opened successfully! Room Code:", this.code, "PIN:", this.pin || "None");
            this.opened = true;
            if (typeof setRoomCode === "function") {
                setRoomCode(this.code + (this.pin ? (" [PIN: " + this.pin + "]") : ""));
            }
            const incomingEl = document.getElementById("incoming");
            if (incomingEl) incomingEl.textContent = " (Ready for players)";

            const curLvl = (this.game.levelHandler && this.game.levelHandler.currentLevel && this.game.levelHandler.currentLevel.name) 
                ? this.game.levelHandler.currentLevel.name 
                : ((typeof urlData !== "undefined" && urlData.lvl) ? urlData.lvl : "one");
            if (typeof saveRoomProgress === "function") {
                saveRoomProgress(this.code, curLvl);
            }
            if (typeof updateNetworkHUD === "function") {
                updateNetworkHUD(0);
            }
        });

        this.peer.on("error", (err) => {
            console.warn("Host peer notice:", err);
            if (err.type === "unavailable-id") {
                // If ID is occupied, pick random 4-char code
                const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
                this.code = "";
                for (let i = 0; i < 4; i++) {
                    this.code += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                this.peerId = "picopark-" + this.code + (this.pin ? ("-" + this.pin) : "");
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
        console.log("Incoming client:", conn.peer);
        const attachIce = (tries = 0) => {
            const pc = conn.peerConnection;
            if (!pc) { if (tries < 20) setTimeout(() => attachIce(tries + 1), 250); return; }
            pc.addEventListener("iceconnectionstatechange", () => {
                console.log("Host ICE with", conn.peer, ":", pc.iceConnectionState);
            });
        };
        attachIce();

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
            if (typeof updateNetworkHUD === "function") {
                updateNetworkHUD(0);
            }

            // Send initial setup to client with roomCode and saved progress
            const curLvl = (this.game.levelHandler && this.game.levelHandler.currentLevel && this.game.levelHandler.currentLevel.name) ? this.game.levelHandler.currentLevel.name : "one";
            conn.send(JSON.stringify({
                setColor: playerColor,
                playerId: clientPlayer.body.id,
                currentLevel: curLvl,
                roomCode: this.code,
                levelSaved: { room: this.code, level: curLvl },
                startGame: Boolean(this.game.running || (this.game.matter && this.game.matter.running))
            }));

            // Track connection stats for HUD
            conn.statsTimer = setInterval(() => {
                if (conn.open && conn.peerConnection && typeof inspectPeerConnection === "function") {
                    inspectPeerConnection(conn.peerConnection, (info) => {
                        if (info.rtt !== null) updateNetworkHUD(info.rtt);
                    });
                }
            }, 1500);

            // Handle incoming data from client
            conn.on("data", (raw) => {
                try {
                    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
                    if (data.ping) {
                        try {
                            conn.send(JSON.stringify({ pong: data.ping }));
                        } catch (e) {}
                    }
                    if (data.requestNextLevel) {
                        console.log("Client requested next level:", data.requestNextLevel);
                        if (typeof setLevel === "function") {
                            setLevel(data.requestNextLevel);
                        } else if (this.game && this.game.renderer) {
                            this.game.renderer.levelTransistion(data.requestNextLevel);
                            this.saveLevelProgress(data.requestNextLevel);
                            this.broadcast(JSON.stringify({
                                setLevel: data.requestNextLevel,
                                currentLevel: data.requestNextLevel
                            }));
                        }
                    }
                    if (data.setUsername) {
                        conn.clientUsername = data.setUsername;
                        // Check if reconnecting existing player
                        let existingPlayer = this.game.players.find(p => p.onlinePlayer && p.disconnected && p.username === data.setUsername);
                        if (existingPlayer) {
                            console.log("Reconnecting existing player:", data.setUsername);
                            existingPlayer.disconnected = false;
                            if (existingPlayer.conn && existingPlayer.conn.graceTimer) {
                                clearTimeout(existingPlayer.conn.graceTimer);
                            }
                            existingPlayer.conn = conn;
                            conn.player = existingPlayer;
                            conn.send(JSON.stringify({
                                setColor: existingPlayer.color,
                                playerId: existingPlayer.body.id,
                                currentLevel: (this.game.levelHandler.currentLevel && this.game.levelHandler.currentLevel.name) || "one"
                            }));
                        } else {
                            if (conn.player) conn.player.username = data.setUsername;
                            if (typeof addPlayerToMenu === "function") {
                                addPlayerToMenu(data.setUsername);
                            }
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
                if (conn.statsTimer) clearInterval(conn.statsTimer);
                const player = conn.player;
                if (player) {
                    player.disconnected = true;
                    // Grace window: retain player body for 20s to allow mobile reconnect
                    conn.graceTimer = setTimeout(() => {
                        const removedId = player.body.id;
                        player.unload();
                        this.broadcast({
                            playerRemoved: removedId
                        });
                    }, 20000);
                }
                if (conn.player) {
                    const removedId = conn.player.body.id;
                    conn.player.unload();
                    this.broadcast({
                        playerRemoved: removedId
                    });
                }
                const idx = this.connections.indexOf(conn);
                if (idx !== -1) this.connections.splice(idx, 1);
                if (typeof updateNetworkHUD === "function") {
                    updateNetworkHUD(0);
                }
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
        
        this.frameCounter = (this.frameCounter || 0) + 1;
        // Fast loop (40Hz / 25ms): player positions and inputs
        // Slow loop (~10Hz / 100ms - every 4th tick): world syncData (doors, keys, blocks)
        // This slashes network bandwidth & buffer queueing by 75%
        const sendSync = (this.frameCounter % 4 === 0);

        const curLvl = (this.game.levelHandler && this.game.levelHandler.currentLevel && this.game.levelHandler.currentLevel.name) ? this.game.levelHandler.currentLevel.name : "one";
        const payload = JSON.stringify({
            currentLevel: curLvl,
            playerData: this.getPlayersData(),
            syncData: (sendSync && this.game.syncHandler) ? this.game.syncHandler.getSyncData() : null
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

    saveLevelProgress(levelName) {
        if (!this.code || !levelName) return;
        if (typeof saveRoomProgress === "function") {
            saveRoomProgress(this.code, levelName);
        }
        this.broadcast(JSON.stringify({
            levelSaved: { room: this.code, level: levelName }
        }));
    }
}
