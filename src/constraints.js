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

        // Slack rope: no pull if players are within 110px of each other
        var restLength = 110;
        if (dst <= restLength || dst === 0) return;

        // Unit vector from A to B
        var nx = dx / dst;
        var ny = dy / dst;

        var stretch = dst - restLength;
        // Smooth proportional pull with a hard ceiling to eliminate flinging/catapulting
        var springK = 0.04;
        var pullForce = Math.min(stretch * springK, 4.0);

        // Damping based on relative velocity along the rope axis to kill oscillations
        var rvx = (bodyA.velocity.x + (pA.constraintVel ? pA.constraintVel.x : 0)) -
                  (bodyB.velocity.x + (pB.constraintVel ? pB.constraintVel.x : 0));
        var rvy = bodyA.velocity.y - bodyB.velocity.y;
        var damping = (rvx * nx + rvy * ny) * 0.15;

        var totalForce = Math.max(0, pullForce + damping);
        var fx = nx * totalForce;
        var fy = ny * totalForce;

        if (pA.constraintVel) pA.constraintVel.x = Math.max(-4, Math.min(4, pA.constraintVel.x + fx * 0.5));
        if (pB.constraintVel) pB.constraintVel.x = Math.max(-4, Math.min(4, pB.constraintVel.x - fx * 0.5));

        var newVyA = Math.max(-10, Math.min(10, bodyA.velocity.y + fy * 0.35));
        var newVyB = Math.max(-10, Math.min(10, bodyB.velocity.y - fy * 0.35));
        Matter.Body.setVelocity(bodyA, v(bodyA.velocity.x, newVyA));
        Matter.Body.setVelocity(bodyB, v(bodyB.velocity.x, newVyB));
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