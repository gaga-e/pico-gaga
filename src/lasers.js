class LaserHandler {
    constructor(game, options) {
        this.game = game;
    }
    updateLasers() {
        for (let i = 0; i < this.game.lasers.length; i++) {
            const laser = this.game.lasers[i];
            laser.updateLaser();
        }
    }
}
class Laser {
    constructor(game, pos, angle, options) {
        this.game = game;
        this.pos = pos;
        this.angle = angle;
        this.enabled = true;

        this.axis = angle % 2 ? "y" : "x";
        this.axisX = this.axis == "x" ? angle - 3 : 0;
        this.axisY = this.axis == "y" ? angle - 2 : 0;
        this.axisB = this.axis == "y";
        this.bound = Math.floor(((angle - 1) / 2) % 2) ? "min" : "max";
        this.bound = this.axisB ? (this.bound == "min" ? "max" : "min") : this.bound;

        let width = 25;
        let height = 100000;
        this.trigger = this.game.triggerHandler.addTrigger(
            v(
                this.pos.x + (height / 2) * this.axisX,
                this.pos.y + (height / 2) * -this.axisY
            ),
            this.axisB ? v(width, height) : v(height, width)
        );

        this.trigger.norender = true;
        this.killTrigger = this.game.triggerHandler.addTrigger(v(this.pos.x, this.pos.y), v(width, width), {
            onIn: (e) => {
                if (e.player && this.enabled && !e.player.dead && (!e.player.onlinePlayer || !window.clientConnection)) {
                    e.player.kill();
                }
            }
        });

        this.length = 10;
    }
    setKillLength(len) {
        if (!this.killTrigger || !this.killTrigger.rect) return;
        let bounds = this.killTrigger.rect.bounds;
        let height = bounds.max[this.axis] - bounds.min[this.axis];
        if (!height || height <= 0) height = 25;
        let setScale = len / height;
        if (!isFinite(setScale) || setScale <= 0.001) setScale = 0.001;

        Matter.Body.scale(this.killTrigger.rect, this.axisB ? 1 : setScale, (!this.axisB) ? 1 : setScale);
        Matter.Body.translate(this.killTrigger.rect, v(
            (this.pos.x - (this.killTrigger.rect.bounds[this.bound][this.axis])) * (this.axisX ? 1 : 0),
            (this.pos.y - (this.killTrigger.rect.bounds[this.bound][this.axis])) * (this.axisY ? 1 : 0)
        ));
    }
    updateLaser() {
        this.setKillLength(this.cal().dst);
    }

    cal() {
        const bodies = (typeof this.game.getCollidableBodies === "function")
            ? this.game.getCollidableBodies()
            : Matter.Composite.allBodies(this.game.matter.engine.world);

        let ray = Matter.Query.collides(this.trigger.rect, bodies);
        let minDst = Infinity;

        for (let i = 0; i < ray.length; i++) {
            const hit = ray[i];
            const mainBody = hit.bodyA.id == this.trigger.rect.id ? hit.bodyB : hit.bodyA;
            if (mainBody.player) continue;

            let signedDist = 0;
            if (this.axisX > 0) {
                signedDist = mainBody.bounds.min.x - this.pos.x;
            } else if (this.axisX < 0) {
                signedDist = this.pos.x - mainBody.bounds.max.x;
            } else if (this.axisY > 0) {
                signedDist = this.pos.y - mainBody.bounds.max.y;
            } else if (this.axisY < 0) {
                signedDist = mainBody.bounds.min.y - this.pos.y;
            } else {
                signedDist = Math.abs(this.pos[this.axis] - mainBody.bounds[this.bound][this.axis]);
            }

            if (signedDist >= 0) {
                minDst = Math.min(signedDist, minDst);
            }
        }

        if (minDst == Infinity || minDst > 10000) minDst = 10000;
        return {
            start: this.pos,
            end: v(this.pos.x + (minDst * this.axisX), this.pos.y + (minDst * -this.axisY)),
            dst: minDst,
        };
    }
}