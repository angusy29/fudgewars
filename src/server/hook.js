let Collidable = require('./collidable');

let utils = require('./utils');

const COOLDOWN = 5;
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
        this.playerPrevX = 0;
        this.playerPrevY = 0;
        this.active = false;
        this.returning = false;
        this.cooldown = 0;
        this.currentDuration = 0;
        this.hookedPlayer = null;
        this.path = [];
    }

    start(angle, x, y) {
        if (!this.active && this.cooldown === 0) {
            this.active = true;
            this.returning = false;
            this.angle = angle;
            this.playerPrevX = x;
            this.playerPrevY = y;
            this.x = x;
            this.y = y;
            this.cooldown = COOLDOWN;
            this.currentDuration = 0;
            this.hookedPlayer = null;
            this.path = [];
        }
    }

    update(delta) {
        if (this.cooldown > 0) {
            this.cooldown -= delta;
            if (this.cooldown < 0) {
                this.cooldown = 0;
            }
        }

        if (this.active) {

            // If the player moves, add that to the hook path
            while (utils.distance(this.player.x, this.player.y, this.playerPrevX, this.playerPrevY) > SPEED) {
                let angle = Math.atan2(this.player.y - this.playerPrevY, this.player.x - this.playerPrevX);
                let x = this.playerPrevX + Math.cos(angle) * SPEED;
                let y = this.playerPrevY + Math.sin(angle) * SPEED;
                this.path.unshift({ x: x, y: y });
                this.playerPrevX = x;
                this.playerPrevY = y;
            }

            if (!this.returning) {
                if (this.currentDuration > DURATION) {
                    this.returning = true;
                } else {
                    this.currentDuration += delta;

                    // Movement
                    this.path.push({ x: this.x, y: this.y });
                    this.x += Math.cos(this.angle) * SPEED;
                    this.y += Math.sin(this.angle) * SPEED;

                    // Collision
                    if (this.world.collidesTerrain(this.getTopLeft(), this.getBottomRight())) {
                        this.returning = true;
                    } else {
                        for (let id in this.world.players) {
                            let other = this.world.players[id];
                            if (this.player.id === other.id) continue;

                            // Player hooked
                            if (this.world.collidesObject(this.getTopLeft(), this.getBottomRight(),
                                other.getFullTopLeft(), other.getFullBottomRight())) {
                                other.getHooked(this.player);
                                this.hookedPlayer = other;
                                this.returning = true;
                            }
                        }
                    }
                }
            } else {
                // Hook returning to player
                let target = this.path.pop();

                let angle = Math.atan2(this.y - target.y, this.x - target.x);
                this.x = target.x;
                this.y = target.y;
                this.angle = angle;

                // Move hooked player
                if (this.hookedPlayer !== null) {
                    let oldX = this.hookedPlayer.x;
                    let oldY = this.hookedPlayer.y;
                    this.hookedPlayer.x = this.x;
                    this.hookedPlayer.y = this.y;

                    // Collision / end
                    if (this.world.collidesObject(this.player.getTopLeft(), this.player.getBottomRight(),
                                                  this.hookedPlayer.getTopLeft(), this.hookedPlayer.getBottomRight())) {
                        this.hookedPlayer.x = oldX;
                        this.hookedPlayer.y = oldY;
                        this.hookedPlayer.getUnhooked();
                        this.deactivate();
                    }
                } else if (this.path.length === 0) {
                    this.deactivate();
                }
            }
        }
    }

    deactivate() {
        this.active = false;
    }

    getRep(toId) {
        let rep = {
            active: this.active,
        }

        // Only give the cooldown info to the player if its the owner of the hook
        if (toId === this.player.id) {
            rep = Object.assign(rep, {
                cooldown: this.cooldown,
            });
        }

        if (this.active) {
            rep = Object.assign(rep, {
                x: this.x,
                y: this.y,
                angle: this.angle,
                returning: this.returning,
            });
        }

        return rep;
    }
}
