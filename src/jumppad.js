class JumppadHandler {
    constructor(game) {
        this.game = game;
        this.comp = Matter.Composite.create();
        Matter.Composite.add(this.game.matter.engine.world, this.comp);
    }
    updateJumppads() {
        for (let i = 0; i < this.game.jumppads.length; i++) {
            const jp = this.game.jumppads[i];
            let height = Math.sin((((new Date()).getTime() + jp.id) / 50)) * 25;
            jp.setHeight(height);
        }
    }
}
class Jumppad {
    constructor(game, pos, options) {
        this.game = game;
        options = {
            ...options,
        };
        this.pos = pos;
        this.id = Math.random() * 500;
        this.baseY = pos.y * 50;
        this.heightDiff = 0;

        this.rect = this.game.matter.addBody(v(pos.x * 50, pos.y * 50), v(50, 50), {}, this.game.jumppadHandler.comp);
        this.rect.isStatic = true;
        this.rect.jumppad = true;
    }

    setHeight(heightChange) {
        this.heightDiff = heightChange;
        // Position static platform stably without distorting hull vertices
        Matter.Body.setPosition(this.rect, v(this.pos.x * 50, this.baseY - (heightChange * 0.5)));
    }
}