let Collidable = require('./collidable');
let utils = require('./utils');
let Hook = require('./hook');
let Sword = require('./sword');

const MAX_VELOCITY = 100;     // px/s
const ACCELERATION = 600;     // px/s/s
const DECELERATION = 1000;   // px/s/s
const BOUNDS = {
    top: 0,
    right: 10,
    bottom: 24,
    left: 10
};

module.exports = class Player extends Collidable {
    constructor(world, id, name, team, x, y) {
        super(world, x, y, BOUNDS);

        this.id = id;
        this.name = name;
        this.team = team;
        this.vx = 0;    // velocity
        this.vy = 0;
        this.ix = 0;    // resolved input, -1, 0, 1
        this.iy = 0;
        this.left = 0;
        this.right = 0;
        this.up = 0;
        this.down = 0;
        this.carryingFlag = null;
        this.alive = true;
        this.respawn = false;

        this.hook = new Hook(world, this);
        this.hookedBy = null;

        this.sword = new Sword(world, this);
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
            // Note: Hook will handle movement
            this.vx = 0;
            this.vy = 0;
        } else {
            this.move(delta);
        }

        // Hook
        this.hook.update(delta);
        this.sword.update(delta);
    }

    getHooked(hooker) {
        this.hookedBy = hooker;
    }

    getUnhooked() {
        this.hookedBy = null;
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

    useHook(angle) {
        if (this.hookedBy === null) {
            this.hook.start(angle, this.x, this.y);
        }
    }

    useSword(angle) {
        this.sword.start(angle);
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

    getRep(toId) {
        let rep = {
            id: this.id,
            name: this.name,
            team: this.team,
            x: this.x,
            y: this.y,
            vx: this.vx,        // velocities used to animate walking
            vy: this.vy,
            left: this.left,    // left and right used to flip sprite
            right: this.right,
            alive: this.alive,
            respawn: this.respawn,
            hook: this.hook.getRep(toId),
            sword: this.sword.getRep(toId),
        }

        return rep;
    }
}
