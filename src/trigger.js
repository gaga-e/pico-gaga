class TriggerHandler {
    constructor(game) {
        this.game = game
        
    }
    addTrigger(pos,size,options) {
        var boxTrigger = Matter.Bodies.rectangle(pos.x,pos.y,size.x,size.y),
            trig = new Trigger(this.game, boxTrigger, options)
        this.game.triggers.push(trig)
        return trig
    }
    updateTriggers() {
        for (let i = 0; i < this.game.triggers.length; i++) {
            const trigger = this.game.triggers[i];
            this.testTrigger(trigger)
        }
    }
    testTrigger(d) {
        let coll = d.testCollision()
        
        if (coll.length>0) {
            d.playerInside = true;
            for (let i = 0; i < coll.length; i++) {
                var playerBody = (coll[i].bodyB.player || coll[i].bodyB.isBlock) ? coll[i].bodyB : coll[i].bodyA;
                d.onIn(playerBody);
            }
        } else {
            d.playerInside = false
        }

        if (d.playerInside && !d.prePlayerInside) {
            d.onEnter()
        }
        if (!d.playerInside && d.prePlayerInside) {
            d.onLeave()
        }

        d.prePlayerInside = d.playerInside

        //console.log(d)
    }
}
class Trigger {
    constructor(game, rect, options) {
        this.game = game
        options = {
            onEnter:()=>{},
            onLeave:()=>{},
            onIn:()=>{},
            ...options,
            
        }
        this.rect = rect
        this.onEnter = options.onEnter
        this.onLeave = options.onLeave
        this.onIn = options.onIn

        this.playerInside = false
        this.prePlayerInside = false
    }
    testCollision() {
        const playerBodies = (this.game && this.game.playerhandler && this.game.playerhandler.playerComp)
            ? this.game.playerhandler.playerComp.bodies
            : [];
        const blockBodies = (this.game && this.game.blockHandler && this.game.blockHandler.comp)
            ? this.game.blockHandler.comp.bodies
            : [];
        
        let hits = [];
        if (playerBodies.length) {
            const pHits = Matter.Query.collides(this.rect, playerBodies);
            for (let i = 0; i < pHits.length; i++) {
                const p = pHits[i].bodyA.id === this.rect.id ? pHits[i].bodyB : pHits[i].bodyA;
                if (p.player && !p.player.dead) hits.push(pHits[i]);
            }
        }
        if (blockBodies.length) {
            const bHits = Matter.Query.collides(this.rect, blockBodies);
            for (let i = 0; i < bHits.length; i++) {
                hits.push(bHits[i]);
            }
        }
        return hits;
    }
}