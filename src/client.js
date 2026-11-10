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
        this.roomCode = roomCode;
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

            // Diagnostics: show WebRTC negotiation state so stalls are visible
            const attachIceLogging = (tries = 0) => {
                const pc = this.conn && this.conn.peerConnection;
                if (!pc) {
                    if (tries < 20) setTimeout(() => attachIceLogging(tries + 1), 250);
                    return;
                }
                const report = () => {
                    console.log("ICE:", pc.iceConnectionState, "| gathering:", pc.iceGatheringState, "| signaling:", pc.signalingState);
                    if (!this.connected && joinEl) {
                        joinEl.innerHTML = `Connecting to room <b>${roomCode}</b>...<br><small style="color:#94a3b8">network: ${pc.iceConnectionState}</small>`;
                    }
                };
                pc.addEventListener("iceconnectionstatechange", report);
                pc.addEventListener("icegatheringstatechange", report);
                pc.addEventListener("icecandidate", (e) => {
                    if (e.candidate) console.log("candidate:", e.candidate.type, e.candidate.protocol, e.candidate.address || "");
                });
                report();
            };
            attachIceLogging();

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
                this.reconnectAttempts = 0;
                clearTimeout(this.connectTimer);
                const recToast = document.getElementById("reconnectToast");
                if (recToast) recToast.remove();
                if (joinEl) {
                    joinEl.innerHTML = `Connected to room <b>${roomCode}</b>!<br><br>Waiting for host to start game...`;
                }

                // Send our username to host
                this.conn.send(JSON.stringify({
                    setUsername: this.username
                }));

                // Live ping & connection quality heartbeat (1.5s)
                if (this.pingTimer) clearInterval(this.pingTimer);
                this.pingTimer = setInterval(() => {
                    if (this.conn && this.conn.open) {
                        try {
                            this.conn.send(JSON.stringify({ ping: Date.now() }));
                        } catch (e) {}
                        const pc = this.conn.peerConnection;
                        if (pc && typeof inspectPeerConnection === "function") {
                            inspectPeerConnection(pc, (info) => {
                                this.connType = info.type;
                                if (info.rtt) updateNetworkHUD(info.rtt, info.type);
                            });
                        }
                    }
                }, 1500);
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
                if (this.pingTimer) clearInterval(this.pingTimer);
                this.connected = false;

                // Automatic mobile reconnect attempts (up to 5 attempts, 2s apart)
                if ((this.reconnectAttempts || 0) < 5) {
                    this.reconnectAttempts = (this.reconnectAttempts || 0) + 1;
                    let toast = document.getElementById("reconnectToast");
                    if (!toast) {
                        toast = document.createElement("div");
                        toast.id = "reconnectToast";
                        toast.style.cssText = "position:fixed;top:60px;left:50%;transform:translateX(-50%);background:#eab308;color:#000;padding:10px 20px;border-radius:8px;font-weight:bold;z-index:99999;";
                        document.body.appendChild(toast);
                    }
                    toast.style.background = "#eab308";
                    toast.style.color = "#000";
                    toast.innerHTML = `⚠️ Connection lost. Reconnecting (${this.reconnectAttempts}/5)...`;
                    setTimeout(() => {
                        console.log("Attempting reconnect", this.reconnectAttempts);
                        this.init(this.roomCode);
                    }, 2000);
                    return;
                }

                let toast = document.getElementById("reconnectToast") || document.createElement("div");
                toast.id = "reconnectToast";
                toast.style.cssText = "position:fixed;top:60px;left:50%;transform:translateX(-50%);background:#ef4444;color:#fff;padding:10px 20px;border-radius:8px;font-weight:bold;z-index:99999;";
                toast.style.background = "#ef4444";
                toast.style.color = "#fff";
                toast.innerHTML = '⚠️ Disconnected from host room. <a href="./index.html" style="color:#fff;text-decoration:underline;margin-left:8px;">Exit to Lobby</a>';
                document.body.appendChild(toast);
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
        if (d.pong) {
            const rtt = Date.now() - d.pong;
            if (typeof updateNetworkHUD === "function") {
                updateNetworkHUD(rtt, this.connType || "Active");
            }
        }
        if (d.currentLevel && this.game.levelHandler) {
            if (this.game.levelHandler.currentLevel && this.game.levelHandler.currentLevel.name !== d.currentLevel) {
                if (!this.game.renderer || !this.game.renderer.isTransitioning) {
                    this.game.levelHandler.setLevel(d.currentLevel);
                }
            }
        }
        if (d.playerRemoved) {
            this.removePlayerById(d.playerRemoved);
        }
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
            const currentName = (this.game.levelHandler && this.game.levelHandler.currentLevel && this.game.levelHandler.currentLevel.name) || "one";
            this.game.levelHandler.setLevel(currentName);
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

    removePlayerById(id) {
        for (let i = 0; i < this.game.players.length; i++) {
            if (this.game.players[i].body.id === id) {
                const p = this.game.players[i];
                p.unload();
                this.game.players.splice(i, 1);
                break;
            }
        }
    }

    updateHostPlayers(players) {
        const activeIds = new Set(players.map(p => p.id));
        activeIds.add(this.mainPlayer.body.id);

        for (let i = this.game.players.length - 1; i >= 0; i--) {
            const p = this.game.players[i];
            if (p.onlinePlayer && !activeIds.has(p.body.id)) {
                p.unload();
                this.game.players.splice(i, 1);
            }
        }

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
