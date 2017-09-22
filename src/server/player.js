let Collidable = require('./collidable');
let Hook = require('./hook');
let utils = require('./utils');

const MAX_VELOCITY = 600;     // px/s
const ACCELERATION = 600;     // px/s/s
const DECELERATION = 1000;   // px/s/s
const HOOKED_SPEED = 30;
const BOUNDS = {
    top: 0,
    right: 10,
    bottom: 24,
    left: 10
};

module.exports = class Player extends Collidable {
    constructor(id, name, x, y, world) {
        super(x, y, BOUNDS, world);

        this.id = id;
        this.name = name;
        this.vx = 0;    // velocity
        this.vy = 0;
        this.ix = 0;    // resolved input, -1, 0, 1
        this.iy = 0;
        this.left = 0;
        this.right = 0;
        this.up = 0;
        this.down = 0;

        this.hook = new Hook(this);
        this.hookedBy = null;
    }

    getFullTopLeft() {
        return {
            x: this.x - 32,
            y: this.y - 32
        };
    }

    getFullBottomRight() {
        return {
            x: this.x + 32,
            y: this.y + 32
        };
    }

    update(delta) {
        if (this.hookedBy !== null) {
            this.moveTowards(this.hookedBy);
            this.vx = 0;
            this.vy = 0;
        } else {
            this.move(delta);
        }

        // Hook
        this.hook.update(delta);
    }

    getHooked(hooker) {
        this.hookedBy = hooker;
    }

    moveTowards(player) {
        let angle = Math.atan2(player.y - this.y, player.x - this.x);

        let steps = 5;
        let collideX = false;
        for (let i = 0; i < steps; i++) {
            let oldX = this.x;
            this.x += (Math.cos(angle) * HOOKED_SPEED) / steps;
            this.x = utils.clamp(this.world.left - this.bounds.left, this.world.right + this.bounds.right, this.x);
            if (this.world.collides(this.id)) {
                if (this.world.collidesObject(this.getTopLeft(), this.getBottomRight(),
                                              player.getTopLeft(), player.getBottomRight())) {
                    this.hookedBy = null;
                }
                this.x = oldX;
                collideX = true;
                this.vx = 0;
            }
            let oldY = this.y;
            this.y += (Math.sin(angle) * HOOKED_SPEED) / steps;
            this.y = utils.clamp(this.world.top + this.bounds.top, this.world.bottom + this.bounds.bottom, this.y);
            if (this.world.collides(this.id)) {
                if (this.world.collidesObject(this.getTopLeft(), this.getBottomRight(),
                                              player.getTopLeft(), player.getBottomRight())) {
                    this.hookedBy = null;
                }
                this.y = oldY;
                this.vy = 0;
                if (collideX) {
                    break;
                }
            }
        }
    }

    move(delta) {
        // Update velocity
        let accel = delta * ACCELERATION;
        let deccel = delta * DECELERATION;
        if (this.vx !== 0 && Math.sign(this.ix) !== Math.sign(this.vx)) {
            if (this.vx > deccel || this.vx < -deccel) {
                this.vx -= deccel * Math.sign(this.vx);
            } else {
                this.vx = 0;
            }
        } else {
            this.vx += accel * this.ix;
        }
        if (this.vy !== 0 && Math.sign(this.iy) !== Math.sign(this.vy)) {
            if (this.vy > deccel || this.vy < -deccel) {
                this.vy -= deccel * Math.sign(this.vy);
            } else {
                this.vy = 0;
            }
        } else {
            this.vy += accel * this.iy;
        }

        // Clamp velocity
        this.vx = utils.clamp(-MAX_VELOCITY, MAX_VELOCITY, this.vx);
        this.vy = utils.clamp(-MAX_VELOCITY, MAX_VELOCITY, this.vy);

        let steps = 5;
        let collideX = false;
        for (let i = 0; i < steps; i++) {
            let oldX = this.x;
            this.x += (this.vx * delta) / steps;
            this.x = utils.clamp(this.world.left - this.bounds.left, this.world.right + this.bounds.right, this.x);
            if (this.world.collides(this.id)) {
                this.x = oldX;
                collideX = true;
                this.vx = 0;
            }
            let oldY = this.y;
            this.y += (this.vy * delta) / steps;
            this.y = utils.clamp(this.world.top + this.bounds.top, this.world.bottom + this.bounds.bottom, this.y);
            if (this.world.collides(this.id)) {
                this.y = oldY;
                this.vy = 0;
                if (collideX) {
                    break;
                }
            }
        }
    }

    startHooking(angle) {
        if (this.hookedBy === null) {
            this.hook.start(angle, this.x, this.y);
        }
    }

    keydown(direction) {
        if (direction === 'up') {
            this.iy = -1;
            this.up = -1;
        } else if (direction === 'down') {
            this.iy = 1;
            this.down = 1;
        } else if (direction === 'left') {
            this.ix = -1;
            this.left = -1;
        } else if (direction === 'right') {
            this.ix = 1;
            this.right = 1;
        }
    }

    keyup(direction) {
        if (direction === 'up') {
            this.up = 0;
            this.iy = this.down;
        } else if (direction === 'down') {
            this.down = 0
            this.iy = this.up;
        } else if (direction === 'left') {
            this.left = 0;
            this.ix = this.right;
        } else if (direction === 'right') {
            this.right = 0;
            this.ix = this.left;
        }
    }

    getRep() {
        let rep = {
            id: this.id,
            name: this.name,
            x: this.x,
            y: this.y,
            vx: this.vx,        // velocities used to animate walking
            vy: this.vy,
            left: this.left,    // left and right used to flip sprite
            right: this.right
        }

        if (this.hook.active) {
            rep = Object.assign(rep, { hook: this.hook.getRep() });
        }

        return rep;
    }
}
