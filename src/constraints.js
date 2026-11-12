class ConstraintHandler {
    constructor(game) {
        this.game = game;
    }
    updateConstraints() {
        for (let i = 0; i < this.game.constraints.length; i++) {
            const c = this.game.constraints[i];
            this.updateConstraint(c);
        }
    }
    updateConstraint(c) {
        if (!c.bodyA || !c.bodyB || !c.bodyA.body || !c.bodyB.body) return;
        var pA = c.bodyA,
            pB = c.bodyB,
            bodyA = pA.body,
            bodyB = pB.body;

        // If either player is dead or ready (in door), the rope goes slack
        if (pA.dead || pB.dead || pA.ready || pB.ready) return;

        var dx = bodyB.position.x - bodyA.position.x;
        var dy = bodyB.position.y - bodyA.position.y;
        var dst = Math.sqrt(dx * dx + dy * dy);

        // Slack zone: free movement within 100px
        var restLength = 100;
        if (dst <= restLength || dst === 0) return;

        var nx = dx / dst;
        var ny = dy / dst;

        var stretch = dst - restLength;
        // Smooth quadratic ramp-in so crossing restLength feels natural, not abrupt
        var ramp = Math.min(stretch / 60, 1.0);
        var springK = 0.035;
        var pullForce = Math.min(stretch * springK * ramp, 3.2);

        // Damping along the tether normal to eliminate jitter and yo-yo oscillations
        var relVx = (bodyB.velocity.x - bodyA.velocity.x);
        var relVy = (bodyB.velocity.y - bodyA.velocity.y);
        var damping = (relVx * nx + relVy * ny) * 0.22;

        var force = Math.max(0, pullForce + damping);
        var fx = nx * force;
        var fy = ny * force;

        // Symmetrical horizontal pull without accumulating runaway velocity
        if (pA.constraintVel) pA.constraintVel.x = Math.max(-3.5, Math.min(3.5, fx * 0.5));
        if (pB.constraintVel) pB.constraintVel.x = Math.max(-3.5, Math.min(3.5, -fx * 0.5));

        // Smooth vertical assist/drag when climbing or jumping together
        var vyAdjustmentA = Math.max(-6, Math.min(6, fy * 0.25));
        var vyAdjustmentB = Math.max(-6, Math.min(6, -fy * 0.25));
        Matter.Body.setVelocity(bodyA, v(bodyA.velocity.x, bodyA.velocity.y + vyAdjustmentA));
        Matter.Body.setVelocity(bodyB, v(bodyB.velocity.x, bodyB.velocity.y + vyAdjustmentB));
    }
    addConstraint(options) {
        var con = new Constraint(options);
        this.game.constraints.push(con);
        return con;
    }
}
class Constraint {
    constructor(options) {
        options = {
            bodyA: undefined,
            bodyB: undefined,
            ...options,
        };
        this.bodyA = options.bodyA;
        this.bodyB = options.bodyB;
    }
}