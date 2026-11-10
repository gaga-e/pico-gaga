class Renderer {
    constructor(game) {
        this.game = game

        this.canvas = document.getElementById("c")
        this.ctx = this.canvas.getContext("2d")

        this.resizeCanvas()
        this.lastFPS = (new Date()).getTime()
        this.fps = 0

        this.offset = v()
        this.levelBounds = {pos:v(),size:v(100,100)}

        this.transistionSpeed = (localfile)?0.1:1

        this.fadeValue = 1
        this.displayedTitle = ""
        
        this.globalScale = 1
        this.border = 80

        this.debug = localfile
        this.userZoom = 1.0;
        this.userPan = { x: 0, y: 0 };
        this.isGesturing = false;
        if (this.canvas) this.canvas.style.touchAction = "none";
        window.onresize = ()=>{this.resizeCanvas()}
        this.setupTouchGestures();
    }
    async levelTransistion(nextLevel) {
        if (this.isTransitioning) return;
        this.isTransitioning = true;
        try {
            this.resetView();
            await this.setFade(1, 400);
            await this.wait(200);
            this.game.levelHandler.setLevel(nextLevel);
            await this.showTitle("-- " + nextLevel + " --", 600);
            await this.setFade(0, 400);
        } finally {
            this.isTransitioning = false;
        }
    }
    async wait(time) {
        return new Promise((resolve)=>{
            setTimeout(() => {
                resolve("done")
            }, time*this.transistionSpeed);
        })
    }
    async setFade(targetFade, time=10) {
        if (this.fadeInterval) {
            clearInterval(this.fadeInterval);
            this.fadeInterval = null;
        }
        return new Promise((resolve, reject) => {
            const startTime = (new Date()).getTime(),
                startValue = this.fadeValue,
                dst = targetFade - startValue,
                totalDuration = Math.max(1, time * this.transistionSpeed);

            this.fadeInterval = setInterval(() => {
                const currentTime = ((new Date()).getTime()) - startTime,
                    timePer = Math.min(1, currentTime / totalDuration);

                this.fadeValue = startValue + (dst * timePer);

                if (currentTime >= totalDuration) {
                    this.fadeValue = targetFade;
                    clearInterval(this.fadeInterval);
                    this.fadeInterval = null;
                    resolve("done");
                }
            }, 1000/60);
        });
    }
    async showTitle(text, time) {
        this.displayedTitle = ""
        return new Promise((resolve, reject) => {
            this.displayedTitle = text
            setTimeout(() => {
                resolve("done")
            
            
            }, time*this.transistionSpeed)
        })
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth
        this.canvas.height = window.innerHeight
        if (this.levelBounds!=undefined) {
            let minScale = Math.min(
                    (this.canvas.width/(this.levelBounds.size.x+(this.border))),
                    (this.canvas.height/(this.levelBounds.size.y+(this.border)))
                )
                
            const isMobile = window.innerWidth <= 900 || (window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
            if (isMobile) {
                const isPortrait = window.innerHeight > window.innerWidth;
                minScale = minScale * (isPortrait ? 1.85 : 1.4);
            }
            this.globalScale = minScale
        }
    }

    init() {
        requestAnimationFrame(()=>{this.renderLoop(this)})
    }
    clearCanvas() {
        this.ctx.globalAlpha = 1.0;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    renderLoop(self) {
        let averageStrength = 50,
            currentFps = (new Date()).getTime()-self.lastFPS
        if(currentFps<100) self.fps = ((self.fps*averageStrength)+currentFps)/(averageStrength+1)
        
        self.clearCanvas()
        self.renderBackground()
        self.ctx.save()
        const isMobile = window.innerWidth <= 900 || (window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
        const effectiveScale = self.globalScale * (self.userZoom || 1.0);
        let camOffsetX = self.offset.x;
        let camOffsetY = self.offset.y;
        if (isMobile && self.levelBounds) {
            const levelWidth = self.levelBounds.size.x;
            const halfScreenWorld = (window.innerWidth * 0.5) / effectiveScale;
            if (levelWidth > halfScreenWorld * 2 && self.game.players && self.game.players[0] && self.game.players[0].body) {
                let playerX = self.game.players[0].body.position.x;
                let clampedCamX = Math.max(halfScreenWorld, Math.min(levelWidth - halfScreenWorld, playerX));
                camOffsetX = 25 - clampedCamX;
            }
            const levelHeight = self.levelBounds.size.y;
            const halfScreenWorldY = (window.innerHeight * 0.5) / effectiveScale;
            if (levelHeight > halfScreenWorldY * 2 && self.game.players && self.game.players[0] && self.game.players[0].body) {
                let playerY = self.game.players[0].body.position.y;
                let clampedCamY = Math.max(halfScreenWorldY, Math.min(levelHeight - halfScreenWorldY, playerY));
                camOffsetY = 25 - clampedCamY;
            } else if (window.innerHeight > window.innerWidth) {
                camOffsetY -= 40;
            }
        }
        self.camOffsetX = camOffsetX;
        self.camOffsetY = camOffsetY;
        self.effectiveScale = effectiveScale;

        const totalOffsetX = camOffsetX + (self.userPan ? self.userPan.x : 0);
        const totalOffsetY = camOffsetY + (self.userPan ? self.userPan.y : 0);

        self.ctx.translate(((totalOffsetX) * effectiveScale) + (window.innerWidth * 0.5), ((totalOffsetY) * effectiveScale) + (window.innerHeight * 0.5));
        self.ctx.scale(effectiveScale, effectiveScale);
        self.renderLevel(self.game.levelHandler)
        self.renderConstraints()

        

        for (let i = 0; i < self.game.players.length; i++) {
            const player = self.game.players[i];
            self.renderPlayer(player)
        }

        self.renderEntities()
        
        if (self.debug) self.renderTriggers()
        if (self.debug) {
            self.ctx.strokeStyle = "#f0f"

            let boundsRect = self.levelBounds
            self.ctx.strokeRect(
                boundsRect.pos.x-5,
                boundsRect.pos.y-5,
                boundsRect.size.x+10,
                boundsRect.size.y+10
                )

        }
        self.ctx.restore()

        if (self.debug) self.renderDebug()

        self.renderEffects()

        self.lastFPS = (new Date()).getTime()
        requestAnimationFrame(()=>{self.renderLoop(self)})
    }
    renderEffects() {
        let fade = Math.max(Math.min(this.fadeValue, 1), 0);
        if (fade > 0.001) {
            this.ctx.save();
            this.ctx.globalAlpha = fade;
            this.ctx.fillStyle = "rgb(255,255,255)";
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.renderTitle();
            this.ctx.restore();
        }
        this.ctx.globalAlpha = 1.0;
    }
    renderTitle() {
        this.ctx.fillStyle = "#c47418"
        this.ctx.font = "30px squareforced"
        let measure = this.ctx.measureText(this.displayedTitle)
        this.ctx.fillText(this.displayedTitle, (window.innerWidth/2)-(measure.width*0.5),window.innerHeight/2)
    }

    renderPlayer(player) {
        if (player.ready) return;
        this.ctx.save()
        var playerPos = player.body.position
        this.ctx.translate(playerPos.x,playerPos.y)
        this.ctx.scale(player.direction,1)
        this.ctx.scale(player.scale,player.scale)
        this.ctx.translate(-playerPos.x,-playerPos.y)
        let frame = drawSprite(this, player)
    
        this.ctx.restore()
        this.ctx.fillStyle = "#f0f"
        if (this.debug) {
            this.ctx.fillText(frame, playerPos.x+(spriteSize.x*0.5)+5,playerPos.y-(spriteSize.y*0.5))
            if (player.conn) {
                this.ctx.fillText(player.conn.clientUsername, playerPos.x,playerPos.y-(spriteSize.y*0.5)-10)
            }
            this.ctx.save()
            this.ctx.beginPath()
            let centerPos = v(player.body.position.x,player.body.position.y+(spriteSize.y*0.5))
            this.ctx.translate(centerPos.x,centerPos.y)
            this.ctx.scale(1.45,0.5)
            this.ctx.translate(-centerPos.x,-centerPos.y)
            this.ctx.arc(centerPos.x,centerPos.y,spriteSize.x*0.25,0,Math.PI*2)

            this.ctx.stroke()
            if(player.onGround()) this.ctx.fill()
            this.ctx.closePath()
            this.ctx.restore()
        }
        if (player.laserShields.length>0) {
            for (let i = 0; i < player.laserShields.length; i++) {
                const sh = player.laserShields[i];
                if (sh!=undefined) {
                this.ctx.save()
                let laserShield = sh.position
                this.ctx.translate(laserShield.x,laserShield.y)
                this.ctx.rotate((sh.shieldAngle*Math.PI*0.5)%(Math.PI*2))
                this.ctx.translate(-laserShield.x,-laserShield.y)
                this.ctx.drawImage(levelAtlas, 
                    108,1368,
                    30,222,
                    sh.position.x-5,sh.position.y-(75/2), 10,75
                    )

                this.ctx.restore()
                }
            }
            

        }

    }
    renderConstraints() {
        for (let i = 0; i < this.game.constraints.length; i++) {
            const con = this.game.constraints[i];
            if (!con.bodyA.ready&&!con.bodyB.ready) {
                this.ctx.beginPath()
                this.ctx.moveTo(con.bodyA.body.position.x,con.bodyA.body.position.y)
                this.ctx.lineTo(con.bodyB.body.position.x,con.bodyB.body.position.y)
                this.ctx.stroke()
                this.ctx.closePath()
            }
            
        }
    }
    renderBackground() {
        var grad = this.ctx.createLinearGradient(window.innerWidth/2, 0, window.innerWidth/2, window.innerHeight)
        
        grad.addColorStop(1,"rgb(255,226,24)")
        grad.addColorStop(0,"rgb(255,176,23)")
        this.ctx.fillStyle = grad
        this.ctx.fillRect(0,0,window.innerWidth,window.innerHeight)
    }
    renderButtons() {
        var cellsize = this.game.levelHandler.currentLevel.cellsize

        for (let i = 0; i < this.game.buttons.length; i++) {
            const but = this.game.buttons[i];
            //console.log(but.trigger)
            if (but.trigger.playerInside) {
                this.ctx.drawImage(levelAtlas, 
                    600,535,
                    161,161,
                    (but.pos.x-0.5)*cellsize.x,(but.pos.y-0.5)*cellsize.y,cellsize.x,cellsize.y)
            } else {
                this.ctx.drawImage(levelAtlas, 
                    389,535,
                    161,161,
                    (but.pos.x-0.5)*cellsize.x,(but.pos.y-0.5)*cellsize.y,cellsize.x,cellsize.y)
                }
            
        }
    }
    renderJumppads() {
        for (let i = 0; i < this.game.jumppads.length; i++) {
            const jp = this.game.jumppads[i];
            let pos = jp.pos,
                cellsize = v(50,50)
            this.ctx.fillStyle = "#f50"
            let heightDiff = (
                Math.sin((((new Date()).getTime()+jp.id)/50))*25
            )
            this.ctx.fillRect(((pos.x-0.5)*cellsize.x),((pos.y-0.5)*cellsize.y)-heightDiff,cellsize.x,cellsize.y+heightDiff)
            
        }
    }
    renderBlocks() {
        for (let i = 0; i < this.game.blocks.length; i++) {
            const boc = this.game.blocks[i];
            let size = v(
                boc.size.x*50,
                boc.size.y*50,
            )
                

            for (let x = 0; x < boc.size.x; x++) {
                for (let y = 0; y < boc.size.y; y++) {
                    
                    let bocPos = v((boc.rect.position.x-(size.x*0.5))+(x*50),(boc.rect.position.y-(size.y*0.5))+(y*50))
                    this.ctx.drawImage(levelAtlas, 
                        655,196,
                        161,161,
                        bocPos.x,bocPos.y,50,50
                        )

                    
                }                
            }
            let text = Math.max(boc.playersNeeded(),0),
                textPos = boc.rect.position
            if (text>0) {
                this.ctx.fillStyle = "#c47418"
                this.ctx.font = "30px squareforced"
                let measure = this.ctx.measureText(text)

                this.ctx.strokeStyle = "#fff"
                this.ctx.lineWidth = 3.5
                this.ctx.strokeText(text, textPos.x-(measure.width*0.5),textPos.y)
                this.ctx.fillText(text, textPos.x-(measure.width*0.5),textPos.y)
            }



        }
    }
    renderDoors() {
        var cellsize = this.game.levelHandler.currentLevel.cellsize

        for (let i = 0; i < this.game.doors.length; i++) {
            const but = this.game.doors[i];
            if (but.open) {
                this.ctx.drawImage(levelAtlas, 
                    591, 885,
                    161 * 2.5, 161 * 2.5,
                    (but.pos.x - 1.5) * cellsize.x, (but.pos.y - 2.5) * cellsize.y, cellsize.x * 2, cellsize.y * 2);

                this.ctx.save();
                this.ctx.font = "bold 15px sans-serif";
                this.ctx.fillStyle = "#4ade80";
                this.ctx.textAlign = "center";
                this.ctx.fillText("🚪 Open! Enter to Leave (↓)", (but.pos.x - 0.5) * cellsize.x, (but.pos.y - 2.8) * cellsize.y);
                this.ctx.restore();
            } else {
                this.ctx.drawImage(levelAtlas, 
                    111, 885,
                    161 * 2.5, 161 * 2.5,
                    (but.pos.x - 1.5) * cellsize.x, (but.pos.y - 2.5) * cellsize.y, cellsize.x * 2, cellsize.y * 2);

                if (but.lockedNoticeTimer > 0) {
                    but.lockedNoticeTimer--;
                    this.ctx.save();
                    this.ctx.font = "bold 15px sans-serif";
                    this.ctx.fillStyle = "#facc15";
                    this.ctx.textAlign = "center";
                    this.ctx.fillText("🗝️ Key Required!", (but.pos.x - 0.5) * cellsize.x, (but.pos.y - 2.8) * cellsize.y);
                    this.ctx.restore();
                }
            }
        }
    }
    renderTriggers() {
        for (let i = 0; i < this.game.triggers.length; i++) {
            const trig = this.game.triggers[i];
            this.ctx.strokeStyle = "#f00"
            var bounds = trig.rect.bounds,
                    size = v(-(bounds.min.x-bounds.max.x),-(bounds.min.y-bounds.max.y))
            if (!trig.norender) this.ctx.strokeRect(bounds.min.x,bounds.min.y, size.x,size.y)
        }
    }
    renderLevel(levelHandler) {
        

        

        var color = "rgb(255,134,77)",
            levelData = levelHandler.currentLevel.data,
                cellsize = levelHandler.currentLevel.cellsize
    
        if (levelData!=undefined) {
            for (let x = 0; x < levelData.length; x++) {
                const row = levelData[x];
                for (let y = 0; y < row.length; y++) {
                    const cell = row[y];
                    this.ctx.fillStyle = color
                    if (cell) {
                        if (!levelData[Math.max(x-1,0)][y]) {
                            this.ctx.drawImage(
                                levelAtlas,
                                126,194,
                                161,161,
                                (y-0.5)*cellsize.x,(x-0.5)*cellsize.y,cellsize.x,cellsize.y
                            )
                        } else{
                            this.ctx.drawImage(
                                levelAtlas,
                                389,191,
                                161,161,
                                (y-0.5)*cellsize.x,(x-0.5)*cellsize.y,cellsize.x,cellsize.y
                            )
                        }
                    }
                }
            }
        }
        this.renderDoors()
        this.renderBlocks()

        this.renderButtons()

        this.renderJumppads()

        this.renderParticles()
        this.renderLasers()

        if(this.debug) {
            var bodies = Matter.Composite.allBodies(this.game.matter.engine.world)
            for (let i = 0; i < bodies.length; i++) {
                const bod = bodies[i];
                var bounds = bod.bounds,
                    size = v(-(bounds.min.x-bounds.max.x),-(bounds.min.y-bounds.max.y))
                this.ctx.strokeStyle = "#f0f"
                this.ctx.lineWidth = 2

                this.ctx.strokeRect(bounds.min.x,bounds.min.y,size.x,size.y)
            }
        }


    }
    renderParticles() {
        let parts = this.game.particleHandler.particles
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            let image = part.image
            this.ctx.drawImage(image.img, image.pos.x,image.pos.y,image.size.x,image.size.y,part.body.position.x-15,part.body.position.y-15, 30,30)
        }
    }
    renderLasers() {
        for (let i = 0; i < this.game.lasers.length; i++) {
            const laser = this.game.lasers[i];
            let points = laser.cal()
            if (laser.enabled) this.renderLaser(points.start, points.end)
        }
    }
    renderLaser(start, end) {
        
        var angle = -getAngle(start, end)-(Math.PI*0.5)
            length = getDst(start, end)

        var laser = {
            startPos:v(start.x,start.y),
            length:length+62,
            angle:angle,
        },
            laserStart = {
                origin:v(0,4),
                size:v(36,92)
            },
            laserSeg = {
                origin:v(57,0),
                size:v(100,100)
            },
            laserEnd = {
                origin:v(170,1),
                size:v(64,99)
            }

            this.ctx.save()

        this.ctx.translate(laser.startPos.x,laser.startPos.y)
        this.ctx.rotate(angle)
        this.ctx.scale(1, 0.5)
        this.ctx.translate(-laser.startPos.x,-laser.startPos.y)

        let segLength = laser.length-(laserStart.size.x)-(laserEnd.size.x)

        let startCen = v(laserStart.size.x*0.5,laserStart.size.y*0.5)
        this.ctx.drawImage(laserAtlas, 
            laserStart.origin.x,laserStart.origin.y,laserStart.size.x,laserStart.size.y,
            laser.startPos.x-(startCen.x),laser.startPos.y-(startCen.y), laserStart.size.x,laserStart.size.y
            )
        
        let segCen = v(laserSeg.size.x*0.5,laserSeg.size.y*0.5)
        this.ctx.drawImage(laserAtlas, 
            laserSeg.origin.x,laserSeg.origin.y,laserSeg.size.x,laserSeg.size.y,
            (laser.startPos.x+laserStart.size.x-startCen.x)-1.5,laser.startPos.y-segCen.y, segLength,laserSeg.size.y
            )
        let endCen = v(laserEnd.size.x*0.5,laserEnd.size.y*0.5)
        this.ctx.drawImage(laserAtlas, 
            laserEnd.origin.x,laserEnd.origin.y,laserEnd.size.x,laserEnd.size.y,
            ((laser.startPos.x+laserStart.size.x-startCen.x)+segLength)-15,laser.startPos.y-endCen.y, laserEnd.size.x,laserEnd.size.y
            )

            this.ctx.restore()
    }
    renderEntities() {
        for (let i = 0; i < this.game.entities.length; i++) {
            const ent = this.game.entities[i];
            ent.render(this.ctx)
            if (ent.constructor.name=="Key"&&this.debug) {
                if (!ent.targetedDoor) {
                    this.ctx.beginPath()
                    this.ctx.arc(ent.pos.x,ent.pos.y,45,0,Math.PI*2)
                    this.ctx.strokeStyle = "#f00"
                    this.ctx.stroke()
                    this.ctx.closePath()

                    if (ent.followingPlayer) {
                        this.ctx.beginPath()

                        this.ctx.moveTo(ent.pos.x,ent.pos.y)
                        this.ctx.lineTo(ent.followingPlayer.body.position.x,ent.followingPlayer.body.position.y)
                        this.ctx.strokeStyle = "#00f"
                        this.ctx.stroke()
                        this.ctx.closePath()

                    }
                }
                
            }
        }
    }
    renderDebug() {
        
        var strings = [
            "break",
            "v69.420",
            "pico park clone | aeolus-1 on github",
                (new Date()),
                "break",
            ...((window.clientConnection)?([
                "--client connection--",

            `server connection: ${window.navigator.onLine}`,
            `fully connected: ${clientConnection.mainConn.fullyConnected}`,
            `ping: ${Math.floor(clientConnection.mainConn.lastPing*10)/10}ms`,
            ]):(window.hostConnection)?([
                "--host connection--",
                `connections: ${hostConnection.connections.length}`,
                ...(
                    function(){
                        var connections = hostConnection.connections,
                            mapConn = new Array(connections.length),
                                returnArray = []

                        for (let i = 0; i < mapConn.length; i++) {
                            const mA = mapConn[i];
                            if (mA) if (mA.clientBody) {
                                returnArray = [...returnArray,
                                    "step",
                                    `username: ${connections[i].clientUsername}`,
                                    `color: ${connections[i].clientBody.color}`,
                                    `id: ${connections[i].clientBody.body.id}`,
                                    `ping: ${Math.floor(connections[i].lastPing*10)/10}ms`,
                                    `S2T connected: ${connections[i].connS2T.peer._open}; T2S connected: ${connections[i].connT2S.peer._open}`
                                ]
                            }
                                
                            
                        }

                        return [...returnArray,]
                    }
                )(),
            ]):([
                "not multiplayer game",
                "step",
                "warm sandy beaches and ",
                "cocktails with the little straw hats",
            ])
            ),
            "break",
            "--matter--",
            `FPS: ${Math.floor(10000/mainGame.renderer.fps)/10}`,
            `bodies: ${Matter.Composite.allBodies(mainGame.matter.engine.world).length}`,
            "break",
            
        ],
            fontsize = 15,
            step = 0

        for (let i = 0; i < strings.length; i++) {
            const str = strings[i];
            if (str=="break") {
                step += fontsize*1
            } else if(str=="step"){
                step += fontsize*0.3
            } else {
                step += fontsize
                ;this.drawDebugText(v(0,step),str, fontsize)}
        }
        
    }
    drawDebugText(pos, string, fontsize) {
        this.ctx.fillStyle = "#000a"
        this.ctx.font = `${fontsize}px Times New Roman`
        var measure = this.ctx.measureText(string)
        

        this.ctx.fillRect(pos.x,pos.y+2,measure.width,(-fontsize))
        this.ctx.fillStyle = "#fff"

        this.ctx.fillText(string, pos.x, pos.y)
    }

    resetView() {
        this.userZoom = 1.0;
        this.userPan = { x: 0, y: 0 };
    }

    setupTouchGestures() {
        let lastDist = 0;
        let lastMid = { x: 0, y: 0 };

        // Restrict gestures strictly to the upper portion of the screen above controls
        const isAllowedGestureTouch = (touch) => {
            if (!touch) return false;
            if (touch.target && touch.target.closest && (touch.target.closest("#onScreenControls") || touch.target.closest(".overlay"))) {
                return false;
            }
            const ctrlEl = document.getElementById("onScreenControls");
            let controlsTop = window.innerHeight * 0.65;
            if (ctrlEl && window.getComputedStyle(ctrlEl).display !== "none") {
                const rect = ctrlEl.getBoundingClientRect();
                if (rect.top > 0) {
                    controlsTop = Math.min(controlsTop, rect.top - 20);
                }
            }
            return touch.clientY < controlsTop;
        };

        const getTouchCenterAndDist = (touches) => {
            const t0 = touches[0];
            const t1 = touches[1];
            const dx = t1.clientX - t0.clientX;
            const dy = t1.clientY - t0.clientY;
            return {
                mid: { x: (t0.clientX + t1.clientX) * 0.5, y: (t0.clientY + t1.clientY) * 0.5 },
                dist: Math.hypot(dx, dy)
            };
        };

        const onTouchStart = (e) => {
            if (e.touches.length === 2 && isAllowedGestureTouch(e.touches[0]) && isAllowedGestureTouch(e.touches[1])) {
                this.isGesturing = true;
                const { mid, dist } = getTouchCenterAndDist(e.touches);
                lastDist = Math.max(dist, 10);
                lastMid = mid;
                if (e.cancelable) e.preventDefault();
            } else {
                this.isGesturing = false;
            }
        };

        const onTouchMove = (e) => {
            if (e.touches.length === 2 && this.isGesturing && isAllowedGestureTouch(e.touches[0]) && isAllowedGestureTouch(e.touches[1])) {
                if (e.cancelable) e.preventDefault();
                const { mid, dist } = getTouchCenterAndDist(e.touches);
                const currentDist = Math.max(dist, 10);

                const currentZoom = this.userZoom || 1.0;
                const zoomFactor = currentDist / lastDist;
                const newZoom = Math.max(0.5, Math.min(3.0, currentZoom * zoomFactor));

                const W = window.innerWidth;
                const H = window.innerHeight;
                const oldScale = this.globalScale * currentZoom;
                const newScale = this.globalScale * newZoom;

                const camX = this.camOffsetX !== undefined ? this.camOffsetX : this.offset.x;
                const camY = this.camOffsetY !== undefined ? this.camOffsetY : this.offset.y;

                // World coordinate that was under lastMid
                const worldX = ((lastMid.x - (W * 0.5)) / oldScale) - (camX + this.userPan.x);
                const worldY = ((lastMid.y - (H * 0.5)) / oldScale) - (camY + this.userPan.y);

                this.userZoom = newZoom;

                // Keep that world point pinned to the new midpoint
                this.userPan.x = ((mid.x - (W * 0.5)) / newScale) - worldX - camX;
                this.userPan.y = ((mid.y - (H * 0.5)) / newScale) - worldY - camY;

                // Clamp userPan so the view doesn't escape to infinity
                const maxPan = 2500;
                this.userPan.x = Math.max(-maxPan, Math.min(maxPan, this.userPan.x));
                this.userPan.y = Math.max(-maxPan, Math.min(maxPan, this.userPan.y));

                lastDist = currentDist;
                lastMid = mid;

                            } else if (this.isGesturing) {
                // If any finger wandered into the controls area, stop gesture immediately
                this.isGesturing = false;
            }
        };

        const onTouchEnd = (e) => {
            if (e.touches.length < 2) {
                this.isGesturing = false;
            }
        };

        window.addEventListener("touchstart", onTouchStart, { passive: false });
        window.addEventListener("touchmove", onTouchMove, { passive: false });
        window.addEventListener("touchend", onTouchEnd, { passive: false });
        window.addEventListener("touchcancel", onTouchEnd, { passive: false });

        window.addEventListener("wheel", (e) => {
            if (e.ctrlKey) {
                if (e.cancelable) e.preventDefault();
                const zoomDelta = e.deltaY < 0 ? 1.06 : 0.94;
                const currentZoom = this.userZoom || 1.0;
                this.userZoom = Math.max(0.5, Math.min(3.0, currentZoom * zoomDelta));
                            }
        }, { passive: false });
    }
}

function renderCheckLoop() {
    for (let i = 0; i < players.length; i++) {
        const player = players[i];
        player.updatePlayerParts()


    }
}

