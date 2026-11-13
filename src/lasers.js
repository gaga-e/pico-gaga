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
        let reachBack = 35;
        let totalLen = height + reachBack;
        let triggerPos = v(
            this.pos.x + (height * 0.5 - reachBack * 0.5) * this.axisX,
            this.pos.y + (height * 0.5 - reachBack * 0.5) * -this.axisY
        );

        this.trigger = this.game.triggerHandler.addTrigger(
            triggerPos,
            this.axisB ? v(width, totalLen) : v(totalLen, width)
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
        if (len <= 0) {
            Matter.Body.setPosition(this.killTrigger.rect, v(-99999, -99999));
            return;
        }
        let safeLen = Math.max(1, len);
        let w = this.axisB ? 25 : safeLen;
        let h = this.axisB ? safeLen : 25;
        let cx = this.pos.x + (this.axisX !== 0 ? (this.axisX * safeLen * 0.5) : 0);
        let cy = this.pos.y + (this.axisY !== 0 ? (-this.axisY * safeLen * 0.5) : 0);

        const temp = Matter.Bodies.rectangle(cx, cy, w, h);
        Matter.Body.setVertices(this.killTrigger.rect, temp.vertices);
        Matter.Body.setPosition(this.killTrigger.rect, v(cx, cy));
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
            let coversEmitter = false;
            const isDynamicBlocker = Boolean(mainBody.shield || mainBody.isBlock);
            if (this.axisX > 0) {
                signedDist = mainBody.bounds.min.x - this.pos.x;
                if (isDynamicBlocker && signedDist < 0 && mainBody.bounds.max.x >= this.pos.x - 30) coversEmitter = true;
            } else if (this.axisX < 0) {
                signedDist = this.pos.x - mainBody.bounds.max.x;
                if (isDynamicBlocker && signedDist < 0 && mainBody.bounds.min.x <= this.pos.x + 30) coversEmitter = true;
            } else if (this.axisY > 0) {
                signedDist = this.pos.y - mainBody.bounds.max.y;
                if (isDynamicBlocker && signedDist < 0 && mainBody.bounds.min.y <= this.pos.y + 30) coversEmitter = true;
            } else if (this.axisY < 0) {
                signedDist = mainBody.bounds.min.y - this.pos.y;
                if (isDynamicBlocker && signedDist < 0 && mainBody.bounds.max.y >= this.pos.y - 30) coversEmitter = true;
            } else {
                signedDist = Math.abs(this.pos[this.axis] - mainBody.bounds[this.bound][this.axis]);
            }

            if (coversEmitter) {
                minDst = 0;
            } else if (signedDist >= 0) {
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