let Collidable = require('./collidable');

const COOLDOWN = 1;
const DURATION = 0.5;

const BOUNDS = {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
};

module.exports = class Hook extends Collidable {
    constructor(player, angle=null) {
        super(0, 0, BOUNDS, player.world);

        this.player = player;
        this.angle = angle;
        this.speed = 20;
        this.startX = 0;
        this.startY = 0;
        this.active = false;
        this.cooldown = 0;
        this.currentDuration = 0;
    }

    start(angle, x, y) {
        if (!this.active && this.cooldown < 0) {
            this.angle = angle;
            this.active = true;
            this.startX = x;
            this.startY = y;
            this.x = x;
            this.y = y;
            this.cooldown = COOLDOWN;
            this.currentDuration = 0;
        }
    }

    update(delta) {
        this.cooldown -= delta;

        if (this.active) {
            if (this.currentDuration > DURATION) {
                this.active = false;
                this.currentDuration = 0;
            } else {
                this.currentDuration += delta;
                this.x += Math.cos(this.angle) * this.speed;
                this.y += Math.sin(this.angle) * this.speed;
            }

            if (this.world.collidesTerrain(this.getTopLeft(), this.getBottomRight())) {
                this.active = false;
            } else {
                for (let id in this.world.players) {
                    let other = this.world.players[id];

                    if (this.player.id === other.id) continue;

                    if (this.world.collidesObject(this.getTopLeft(), this.getBottomRight(),
                                                  other.getFullTopLeft(), other.getFullBottomRight())) {
                        other.getHooked(this.player);
                        this.active = false;
                    }
                }
            }
        }
    }

    getRep() {
        return {
            startX: this.startX,
            startY: this.startY,
            x: this.x,
            y: this.y,
        }
    }
}
