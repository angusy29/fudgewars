let Collidable = require('./collidable');
let utils = require('./utils');

const COOLDOWN = 1;
const DURATION = 1;
const SPEED = 12;
const RETURN_DISTANCE = SPEED + 1;

const BOUNDS = {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
};

module.exports = class Hook extends Collidable {
    constructor(world, player, angle=null) {
        super(world, 0, 0, BOUNDS);

        this.player = player;
        this.angle = angle;
        this.startX = 0;
        this.startY = 0;
        this.active = false;
        this.returning = false;
        this.cooldown = 0;
        this.currentDuration = 0;
        this.hookedPlayer = null;
    }

    start(angle, x, y) {
        if (!this.active && this.cooldown < 0) {
            this.active = true;
            this.returning = false;
            this.angle = angle;
            this.startX = x;
            this.startY = y;
            this.x = x;
            this.y = y;
            this.cooldown = COOLDOWN;
            this.currentDuration = 0;
            this.hookedPlayer = null;
        }
    }

    update(delta) {
        this.cooldown -= delta;

        if (this.active) {
            if (!this.returning) {
                if (this.currentDuration > DURATION) {
                    this.returning = true;
                } else {
                    this.currentDuration += delta;
                    this.x += Math.cos(this.angle) * SPEED;
                    this.y += Math.sin(this.angle) * SPEED;

                    if (this.world.collidesTerrain(this.getTopLeft(), this.getBottomRight())) {
                        this.returning = true;
                    } else {
                        for (let id in this.world.players) {
                            let other = this.world.players[id];

                            if (this.player.id === other.id) continue;

                            if (this.world.collidesObject(this.getTopLeft(), this.getBottomRight(),
                                other.getFullTopLeft(), other.getFullBottomRight())) {
                                other.getHooked(this.player);
                                this.hookedPlayer = other;
                                this.returning = true;
                            }
                        }
                    }
                }
            } else if (this.hookedPlayer === null) {
                // Move hook back if no hooked player, otherwise the hooked player will handle it
                let angle = Math.atan2(this.player.y - this.y, this.player.x - this.x);

                this.x += (Math.cos(angle) * SPEED);
                this.y += (Math.sin(angle) * SPEED);

                if (utils.distance(this.x, this.y, this.player.x, this.player.y) < RETURN_DISTANCE) {
                    this.deactivate();
                }
            }
        }
    }

    deactivate() {
        this.active = false;
    }

    getRep() {
        return {
            startX: this.startX,
            startY: this.startY,
            x: this.x,
            y: this.y,
            angle: this.angle,
        }
    }
}
