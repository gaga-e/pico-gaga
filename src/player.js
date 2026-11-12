class PlayerHandler {
    constructor(game) {
        this.game = game
        this.playerComp = Matter.Composite.create()
        Matter.Composite.add(this.game.matter.engine.world, this.playerComp)

    }
    addPlayer(options) {
        var newPlayer = new Player(this.game, options)
        this.game.players.push(newPlayer)
        return newPlayer
    }
    updateControls() {
        var players = this.game.players,
            readyPlayers = this.game.players.length
        for (let i = 0; i < players.length; i++) {
            const player = players[i];
            this.updatePlayerControls(player)
            
            
        }
        updateControls()

    }
    updatePlayers() {
        var players = this.game.players,
            readyPlayers = this.game.players.length
        for (let i = 0; i < players.length; i++) {
            const player = players[i];
            this.updatePlayer(player)
            if (player.ready) {
                readyPlayers-=1
            }
            
        }
        

    }
    updatePlayer(player) {
        player.testFalling();
        player.updatePlayerParts();

        if (player.dead) {
            if (!player.respawnTimer) player.respawnTimer = 65;
            player.respawnTimer--;
            if (player.respawnTimer <= 0) {
                if (!player.onlinePlayer || !window.clientConnection) {
                    player.respawn();
                }
            }
        }
    }
    updatePlayerControls(player) {
        if (!player.onlinePlayer && window.keys) {
            player.keys = { ...window.keys };
        }
        // Remote (online) players are synchronized via network state - do not double-simulate inputs
        if (player.onlinePlayer) {
            return;
        }
        var c = player.controls,
            keys = player.keys
        //if (window.clientConnection) if(window.clientConnection.mainPlayer.body.id==player.body.id) return true

        var walking = false
        if (!player.dead && !player.ready) {
        if (keys[c[0]]) {
            player.moveHor(-1)
            walking = true
            
        }
        if (keys[c[1]]) {
            player.moveHor(1)
            walking = true
        }
        if (walking) {
            if (!player.dead) player.frame = !player.blockingDirection?"walking":"pushing"
            

        } else if (player.onGround()) {
            if (!player.dead) player.frame = "idle"
        } else {
            if (!player.dead) player.frame = "falling"
        }
        if (keys[c[2]]) player.jump()
    }
        

    }

   
}

class Player {
    constructor(game, options) {
        this.game = game
        options = {
            color:this.game.fetchColor(),
            controls:["arrowleft","arrowright","arrowup","arrowdown"],
            bodyOptions:{},
            hasShield:3,
            ...options,
        }
        this.options = options
        this.color = options.color
        this.colorTag = {
            "red":"#f00",
            "blue":"#00f",
            "blue":"#ff0",
        }[this.color]

        this.controls = options.controls
        this.keys = {}

        let debug = 0

        this.exitTimer = 60
        
        this.constraintVel = v()

        

        this.direction = 1
        this.scale = 1

        this.body = this.game.matter.addBody(v(30,(this.game.players.length*50)),v(40,46),{
            ...options.bodyOptions,
            inertia:Infinity,
            
            isStatic:false,render:{visible:debug}}, this.game.playerhandler.playerComp)
        this.body.player = this
        this.onlinePlayer = false
        this.blockingDirection = 0

        this.ready = false

        this.hasShield = {
            1:false,
            2:false,
            3:false,
            4:false,
        }
        this.preHasShield = {
            1:false,
            2:false,
            3:false,
            4:false,
        }
        this.laserShields = []

        

        

        this.frame = "idle"
        this.preFalling = false
        this.groundDetector = Matter.Bodies.circle(this.body.position.x,this.body.position.y+(spriteSize.x*0.5), spriteSize.x*0.25,{
            collisionFilter:{
                group:-1,
                catagory:2,
                mask:0,
            },

            noGravity:true,
            render:{visible:debug}
        })
        this.groundDetector.player = this
        Matter.Body.scale(this.groundDetector, 1.45,0.5)

        this.horizontalDetector = Matter.Bodies.rectangle(
            this.body.position.x,
            this.body.position.y,
            spriteSize.x * 0.98,
            spriteSize.y * 0.55,
            {
                collisionFilter: {
                    group: -1,
                    catagory: 2,
                    mask: 0,
                },
                noGravity: true,
                isSensor: true
            }
        )
        this.horizontalDetector.player = this
        if (this.game.invalidateCollidables) this.game.invalidateCollidables()
    }
    unload() {
        this.unloading = true
        Matter.Composite.remove(this.game.playerhandler.playerComp, this.body)
        if (this.game.invalidateCollidables) this.game.invalidateCollidables()
    }
    testForShield() {
        let a = [1,2,3,4]
        for (let i = 0; i < a.length; i++) {
            const num = a[i];
            if (this.hasShield[num]&&!this.preHasShield[num]) {

                this.giveShield(num)
            } else if (this.preHasShield[num]&&!this.hasShield[num]) {
                console.log(this.laserShields)
                if (this.laserShields[num]!=undefined) {
                    Matter.Composite.remove(this.game.matter.engine.world,this.laserShields[num])
                    this.laserShields[num] = undefined
                }
            }
        }

        
        this.preHasShield = {...this.hasShield}
    }
    giveShield(angle) {
        let axis = (angle % 2),
            laserShield = Matter.Bodies.rectangle(this.body.position.x, this.body.position.y, axis ? 65 : 10, (!axis) ? 65 : 10, {
            isStatic: true,
            isSensor: true,
            collisionFilter: {
                group: -1,
                category: 2,
                mask: 0,
            },
        });
        laserShield.shield = true;
        laserShield.shieldAngle = angle;
        laserShield.laserShieldPos = rotate(0, 0, -50, 0, angle * Math.PI * 0.5);
        Matter.Composite.add(this.game.matter.engine.world, laserShield);
        this.laserShields[angle] = laserShield;
        if (this.game && this.game.invalidateCollidables) {
            this.game.invalidateCollidables();
        }
    }
    removeShield() {
        this.hasShield = {
            1: false,
            2: false,
            3: false,
            4: false,
        };
        if (this.laserShields) {
            for (let i = 0; i < this.laserShields.length; i++) {
                const sh = this.laserShields[i];
                if (sh && this.game && this.game.matter) {
                    Matter.Composite.remove(this.game.matter.engine.world, sh);
                }
            }
        }
        this.laserShields = [];
        this.preHasShield = { ...this.hasShield };
        if (this.game && this.game.invalidateCollidables) {
            this.game.invalidateCollidables();
        }
    }
    readyUp(pos) {
        this.ready = true;
        this.unreadyPos = pos;
        this.body.isStatic = true;
        Matter.Body.setVelocity(this.body, v(0, 0));
        this.constraintVel = v(0, 0);
        this.body.collisionFilter = {
            category: 2,
            group: -1,
            mask: 0
        };
        if (window.AudioEngine) AudioEngine.play("enter");
    }
    unReady() {
        if (this.unreadyPos) Matter.Body.setPosition(this.body, v(this.unreadyPos.x,this.unreadyPos.y))
        this.body.isStatic = false
        this.ready = false

    }
    kill() {
        if (this.dead) return;
        this.dead = true;
        this.frame = "dead";
        this.respawnTimer = 65; // ~1.1s death delay before individual respawn
        Matter.Body.setVelocity(this.body, v(this.body.velocity.x * 0.4, -9));
        if (window.AudioEngine) AudioEngine.play("death");
    }

    restart(i = 0) {
        this.respawn(i);
    }

    respawn(i = null) {
        this.dead = false;
        this.ready = false;
        this.body.isStatic = false;
        this.constraintVel = v(0, 0);
        this.body.collisionFilter = {
            category: 1,
            group: 0,
            mask: 4294967295
        };
        const idx = (i !== null) ? i : ((this.game && this.game.players) ? Math.max(0, this.game.players.indexOf(this)) : 0);
        const totalPlayers = (this.game && this.game.players) ? Math.max(1, this.game.players.length) : 1;

        const currentLvl = this.game && this.game.levelHandler && this.game.levelHandler.currentLevel;
        let baseX = 120;
        let baseY = 120;
        let playerOffset = ((idx % 4) * 35);

        if (currentLvl && currentLvl.spawn) {
            baseX = currentLvl.spawn.x;
            baseY = currentLvl.spawn.y;
            playerOffset = (idx - (totalPlayers - 1) * 0.5) * 28;
        } else if (currentLvl && currentLvl.name === "twenty") {
            baseX = 250;
            baseY = 65;
            playerOffset = (idx - (totalPlayers - 1) * 0.5) * 28;
        }

        const spawnX = baseX + playerOffset;
        const spawnY = baseY;
        Matter.Body.setPosition(this.body, v(spawnX, spawnY));
        Matter.Body.setVelocity(this.body, v(0, 0));
        this.frame = "idle";
        this.respawnTimer = 0;
        this.setScale(1);
    }

    updateKeys(keys) {
        this.keys = {...keys}
    }

    testFalling() {
        // Pit detection: dynamic based on level bounds
        let maxLevelY = 1600;
        if (this.game && this.game.levelHandler && this.game.levelHandler.currentLevel && this.game.levelHandler.currentLevel.levelBounds) {
            maxLevelY = this.game.levelHandler.currentLevel.levelBounds.size.y + 200;
        }

        if (this.body.position.y > maxLevelY && !this.dead) {
            this.kill();
            return;
        }

        let ground = this.getGround()
       if (ground!=undefined) {

           if (ground.bodyA.jumppad||ground.bodyB.jumppad) {
               this.jump(2)
           }

       }
       if (this.dead&&!this.preDead) {
        this.body.collisionFilter = {
            mask:0,
            group:1,
            mask:-1,
        }
       } else if (!this.dead&&this.preDead) {
        this.body.collisionFilter = {
            category: 1,
            group: 0,
            mask: 4294967295
        }
       }
       this.preDead = this.dead

        
        

       if (!this.dead) {
            var falling = !this.onGround()
            if (falling) {
                this.frame = (Math.sign(this.body.velocity.y)>0)?"falling":"leaping"
            } else if (this.preFalling) {
                this.frame = "idle"
            }

            this.preFalling = falling
        }
    }

    onGround() {
        const bodies = (typeof this.game.getCollidableBodies === "function")
            ? this.game.getCollidableBodies()
            : Matter.Composite.allBodies(this.game.matter.engine.world);
        const hits = Matter.Query.collides(this.groundDetector, bodies);
        for (let i = 0; i < hits.length; i++) {
            const other = (hits[i].bodyA.id === this.groundDetector.id) ? hits[i].bodyB : hits[i].bodyA;
            if (other.id !== this.body.id && other.id !== this.groundDetector.id && !other.shield && !other.isSensor) {
                return true;
            }
        }
        return false;
    }
    getGround() {
        const bodies = (typeof this.game.getCollidableBodies === "function")
            ? this.game.getCollidableBodies()
            : Matter.Composite.allBodies(this.game.matter.engine.world);
        const hits = Matter.Query.collides(this.groundDetector, bodies);
        for (let i = 0; i < hits.length; i++) {
            const other = (hits[i].bodyA.id === this.groundDetector.id) ? hits[i].bodyB : hits[i].bodyA;
            if (other.id !== this.body.id && other.id !== this.groundDetector.id && !other.shield && !other.isSensor) {
                return hits[i];
            }
        }
        return undefined;
    }

    moveHor(dir, visited = null) {
        if (!visited) visited = new Set();
        visited.add(this);
        var speed = 2.75 * this.game.deltaTime;
        Matter.Body.setPosition(this.body, v(this.body.position.x + (dir * speed), this.body.position.y));
        if (this.testPlayerCollision()) {
            Matter.Body.setPosition(this.body, v(this.body.position.x - (dir * speed), this.body.position.y));
        }
        if (dir != this.blockingDirection) {
            var playersOnTop = this.findPlayerGroundDectors();
            for (let i = 0; i < playersOnTop.length; i++) {
                var bodyIs = (playersOnTop[i].bodyA.label != "Rectangle Body") ? "bodyA" : "bodyB";
                var player = playersOnTop[i][bodyIs] && playersOnTop[i][bodyIs].player;
                if (player && !visited.has(player)) {
                    player.moveHor(dir, visited);
                }
            }
        }
        this.direction = Math.sign(dir);
        this.updatePlayerParts();
        if (this.laserShields && this.laserShields.length) {
            for (let i = 0; i < this.laserShields.length; i++) {
                const sh = this.laserShields[i];
                if (sh) {
                    Matter.Body.setPosition(sh, v(this.body.position.x + sh.laserShieldPos.x, this.body.position.y + sh.laserShieldPos.y));
                }
            }
        }
    }
    findPlayerGroundDectors() {
        var players = this.game.players,
            dectors = []
        for (let i = 0; i < players.length; i++) {
            const player = players[i];
            if (player.body.id!=this.body.id) dectors.push(player.groundDetector)
        }

        return Matter.Query.collides(this.body, dectors)
    }
    testPlayerBlockCollision() {
        this.blockingDirection = 0;
        const px = this.body.position.x;
        const py = this.body.position.y;
        const pw = 45 * this.scale;
        const ph = 40 * this.scale;

        for (let i = 0; i < this.game.blocks.length; i++) {
            const blk = this.game.blocks[i];
            if (!blk.rect || blk.rect.isStatic) continue;
            const bx = blk.rect.position.x;
            const by = blk.rect.position.y;
            const bw = blk.size.x * 50;
            const bh = blk.size.y * 50;
            const overlapY = Math.abs(py - by) < (ph + bh) * 0.45;
            const overlapX = Math.abs(px - bx) < (pw * 0.65 + bw * 0.5);
            if (overlapY && overlapX) {
                blk.pressing[this.body.id] = true;
                this.blockingDirection = Math.sign(bx - px);
            }
        }
    }
    testPlayerCollision() {
        const bodies = (typeof this.game.getCollidableBodies === "function")
            ? this.game.getCollidableBodies()
            : Matter.Composite.allBodies(this.game.matter.engine.world);
        const detector = this.horizontalDetector || this.body;
        const hits = Matter.Query.collides(detector, bodies);
        for (let i = 0; i < hits.length; i++) {
            const other = (hits[i].bodyA.id === detector.id) ? hits[i].bodyB : hits[i].bodyA;
            if (other.id === this.body.id || other.id === this.groundDetector.id || other.shield || other.isSensor) continue;
            if (other.isBlock && other.block && other.block.locked()) continue;
            return true;
        }
        return false;
    }
    jump(str=1) {
        if (this.ready) {
            this.unReady();
        } else if (this.onGround()) {
            Matter.Body.setVelocity(this.body, v(this.body.velocity.x, -13 * str));
            if (!this.onlinePlayer && window.AudioEngine) AudioEngine.play("jump");
        }
        //this.updatePlayerParts()
    }

    updatePlayerParts() {
        this.testPlayerBlockCollision(true)
        Matter.Body.setAngle(this.body, 0)
        Matter.Body.setAngularVelocity(this.body, 0)
        Matter.Common.set(this.body, "anglePrev", 0)
        Matter.Common.set(this.body, "angularSpeed", 0)

        Matter.Common.set(this.body, "mass", 1)
        if (this.constraintVel && this.constraintVel.x) {
            Matter.Body.setPosition(this.body, v(
                this.body.position.x + this.constraintVel.x,
                this.body.position.y,
            ));
            this.constraintVel.x = 0;
        }

        this.testForShield()

        
        Matter.Body.setPosition(this.groundDetector, v(this.body.position.x,this.body.position.y+(spriteSize.y*0.5*this.scale)))
        if (this.horizontalDetector) Matter.Body.setPosition(this.horizontalDetector, v(this.body.position.x, this.body.position.y))
        if (this.laserShields.length>0) {
            for (let i = 0; i < this.laserShields.length; i++) {
                const sh = this.laserShields[i];
                //console.log(sh)
                if (sh!=undefined) {
                    Matter.Body.setPosition(sh, v(this.body.position.x+sh.laserShieldPos.x,this.body.position.y+sh.laserShieldPos.y))
                    Matter.Body.setVelocity(sh, v(0,0))
                }
            }
            
        }
        Matter.Body.setVelocity(this.body, v(this.body.velocity.x*0,this.body.velocity.y))

        this.lastXPosition = this.body.position.x
        
    }
    setScale(targetScale) {
        var scaleFactor = targetScale/this.scale
        Matter.Body.scale(this.body, scaleFactor,scaleFactor)
        Matter.Body.scale(this.groundDetector, scaleFactor,scaleFactor)
        if (this.horizontalDetector) Matter.Body.scale(this.horizontalDetector, scaleFactor,scaleFactor)

        this.scale = targetScale
    }

  
}



