class Game {
    constructor(options) {
        options = {
            ...options,
        }

        this.mobile = []
        this.players = []
        this.constraints = []
        this.playersBinded = false
        this.buttons = []
        this.doors = []
        this.blocks = []
        this.lasers = []
        this.jumppads = []

        this.triggers = []

        this.entities = []

        this.matter = new MatterHandler(this)
        this.triggerHandler = new TriggerHandler(this)
        this.playerhandler = new PlayerHandler(this)
        this.blockHandler = new BlockHandler(this)
        this.laserHandler = new LaserHandler(this)
        this.jumppadHandler = new JumppadHandler(this)

        this.levelHandler = new LevelHandler(this)
        this.renderer = new Renderer(this)
        this.constraintHandler = new ConstraintHandler(this)

        this.entityHandler = new EntityHandler(this)
        this.particleHandler = new ParticleHandler(this)


        this.syncHandler = new SyncHandler(this)

        

        this.updateMobiles = function(self){
            self.updateDelta()
            

            self.playerhandler.updateControls()
            self.playerhandler.updatePlayers()
            self.laserHandler.updateLasers()
            self.blockHandler.updateBlocks()
            self.jumppadHandler.updateJumppads()
            

            self.constraintHandler.updateConstraints()
            self.triggerHandler.updateTriggers()
            
            self.updateEntities()


        }
        this.afterUpdateMobiles = function(self) {
            for (let i = 0; i < self.players.length; i++) {
                const player = self.players[i];
                if (player.unloading) {
                    self.players.splice(i, 1);
                } else {
                    player.updatePlayerParts();
                }
            }
        };

        this.currentColor = randInt(0,7)
        this.lastDelta = 0
        this.deltaTime = 0
        this._collidableCache = null;
        this._collidableCacheDirty = true;
    }
    getCollidableBodies() {
        if (!this._collidableCache || this._collidableCacheDirty) {
            this._collidableCache = Matter.Composite.allBodies(this.matter.engine.world);
            this._collidableCacheDirty = false;
        }
        return this._collidableCache;
    }
    invalidateCollidables() {
        this._collidableCacheDirty = true;
    }
    updateDelta() {
        let now = (new Date()).getTime();
        if (!this.lastDelta) this.lastDelta = now;
        let delta = (now - this.lastDelta) / (1000 / 60);
        this.deltaTime = Math.max(0.5, Math.min(delta, 1.8));
        this.lastDelta = now;
    }
    

    async initRender() {
        this.renderer.init()
        await this.renderer.wait(700)
        await this.renderer.showTitle(`-- ${this.runTemp?"untitled level":"one"} --`, 500)
        await this.renderer.setFade(0, 1000)
    }
    initPhysics() {
        this.matter.init()
        Matter.Events.on(this.matter.engine, "beforeUpdate", ()=>{this.updateMobiles(this)})
        Matter.Events.on(this.matter.engine, "afterUpdate", ()=>{this.afterUpdateMobiles(this)})

    }

    fetchColor() {
        var colors = Object.keys(colorMods)
        this.currentColor+=1
        return colors[this.currentColor%colors.length]
    }
    updateEntities() {
        for (let i = 0; i < this.entities.length; i++) {
            const ent = this.entities[i];
            ent.update()
            if (ent.unload) this.entities.splice(i, 1)
        }
    }

    testInit() {
        this.initPhysics()
            //addBody(v(0,500),v(2000,50),{isStatic:true,render:levelRender})
        
        
        this.syncHandler.addControl("keys", ()=>{
            let es = []
            for (let i = 0; i < this.entities.length; i++) {
                const e = this.entities[i];
                es.push({
                    pos: { x: round1(e.pos.x), y: round1(e.pos.y) },
                    vel: { x: round1(e.vel.x), y: round1(e.vel.y) },
                    id: e.id,
                });
            }
            return es
            
        }, (d)=>{
            
            var check = (id) => {
                for (let i = 0; i < this.entities.length; i++) {
                    const ent = this.entities[i];
                    if (ent.id==id) {
                        return ent
                    }
                }; return false
            }
            let key = d
            
            let foundEnt = check(key.id);
            if (foundEnt) {
                let ent = foundEnt;
                let dx = key.pos.x - ent.pos.x;
                let dy = key.pos.y - ent.pos.y;
                if (dx * dx + dy * dy > 2500) {
                    ent.pos.x = key.pos.x;
                    ent.pos.y = key.pos.y;
                } else {
                    ent.pos.x += dx * 0.45;
                    ent.pos.y += dy * 0.45;
                }
                ent.vel = key.vel;
            } else {
                console.log("create keys")
                var newKey = new Key(this, v(key.pos.x,key.pos.y), {})
                newKey.id = key.id
                this.entities.push(newKey)
            }


            
        })
        this.syncHandler.addControl("doors", ()=>{
            let es = []
            for (let i = 0; i < this.doors.length; i++) {
                const e = this.doors[i];
                es.push( {
                    open:e.open,
                    pos:e.pos,
                    id:e.id,
                } )
            }
            return es
            
        }, (d)=>{
            
            var check = (id) => {
                for (let i = 0; i < this.doors.length; i++) {
                    const ent = this.doors[i];
                    if (ent.id==id) {
                        return ent
                    }
                }; return false
            }
            let key = d
            
            let foundEnt = check(key.id)
            if (foundEnt) {
                let ent = foundEnt
                ent.open = key.open
                
            } else {
                console.log("create door")
                let cellsize = v(50,50)
                let dor = new Door(key.pos, {
                    nextLevel: "one",
                    open: key.open,
                  })
                  dor.trigger = this.triggerHandler.addTrigger(v((dor.pos.x-0.5)*cellsize.x,(dor.pos.y-1.5)*cellsize.y),v(cellsize.x*2,cellsize.y*2))
                dor.id = key.id
                this.doors.push(dor)
                dor.game = this
                
            }


            
        })
        this.syncHandler.addControl("blocks", ()=>{
            let es = []
            for (let i = 0; i < this.blocks.length; i++) {
                const e = this.blocks[i];
                es.push({
                    pos: { x: round1(e.rect.position.x), y: round1(e.rect.position.y) },
                    gridPos: e.pos,
                    size: e.size,
                    id: e.id,
                    options: { minPlayers: e.minPlayers || 0, static: !!(e.options && e.options.static) }
                });
            }
            return es
            
        }, (d)=>{
            
            var check = (id) => {
                for (let i = 0; i < this.blocks.length; i++) {
                    const ent = this.blocks[i];
                    if (ent.id==id) {
                        return ent
                    }
                }; return false
            }
            let key = d
            
            let foundEnt = check(key.id);
            if (foundEnt) {
                let ent = foundEnt;
                let cur = ent.rect.position;
                let dx = key.pos.x - cur.x;
                let dy = key.pos.y - cur.y;
                if (dx * dx + dy * dy > 2500) {
                    Matter.Body.setPosition(ent.rect, key.pos);
                } else if (dx * dx + dy * dy > 0.04) {
                    Matter.Body.setPosition(ent.rect, {
                        x: cur.x + dx * 0.45,
                        y: cur.y + dy * 0.45
                    });
                }
            } else {
                console.log("create block", key)
                let block = this.blockHandler.addBlock(v(key.gridPos.x,key.gridPos.y), key.size, key.options)
                block.id = key.id

                
            }


            
        })

        
        

       
        /*
        
        this.playerhandler.addPlayer({
            controls:["a","d","w","s"],
            color:"orange",
        }) 
    
        this.playerhandler.addPlayer({
            
            color:"pink",
        }) 
        this.playerhandler.addPlayer({
            color:"purple",
        }) 
        this.playerhandler.addPlayer({
            color:"gray",
        }) 
        
        this.playerhandler.addPlayer({
            color:"blue",
        }) 
        this.playerhandler.addPlayer({
            color:"yellow",
        }) */

        if (this.runTemp) {
            this.levelHandler.loadLevel(levels.tempLevel, "tempLevel")
        } else {
            let startLvl = "one";
            if (typeof urlData !== "undefined" && urlData.lvl && typeof levels !== "undefined" && levels[urlData.lvl]) {
                startLvl = urlData.lvl;
            }
            this.levelHandler.setLevel(startLvl)
        }

        this.running = true

        
    }

    bindPlayers(players) {
        if (!players || players.length < 2) {
            this.playersBinded = false;
            return;
        }
        let pla = players.slice().sort((a,b)=>{
            return Math.sign((a.color).hashCode()-(b.color).hashCode());
        });
        console.log("Binding players:", pla.map(p => p.color));
        for (let i = 0; i < pla.length; i++) {
            if (pla.length === 2 && i === 1) break; // Only 1 constraint needed between 2 players
            let bodyB = pla[(i + 1) % pla.length];
            this.constraintHandler.addConstraint({
                bodyA: pla[i],
                bodyB: bodyB,
            });
        }
        this.playersBinded = true;
    }
}