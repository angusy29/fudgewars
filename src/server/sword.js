let Collidable = require('./collidable');
let utils = require('./utils');

const COOLDOWN = 0.5;
const ATTACK_DELAY = 100;
const ATTACK_LENGTH = 15;
const PUSH_BACK = 600;
const BOUNDS = {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
};

module.exports = class Sword extends Collidable {
    constructor(world, player) {
        super(world, 0, 0, BOUNDS);

        this.player = player;
        this.active = false;
        this.cooldown = 0;
        this.angle = 0;
    }

    static get SWORD_DAMAGE() {
        return 10;
    }

    start(angle, x, y) {
        if (this.player.alive && !this.active && this.cooldown === 0 && !this.player.hookedBy) {
            this.active = true;
            this.angle = angle;
            this.cooldown = COOLDOWN;
        }

        setTimeout(() => {
            this.active = false;
            if (!this.player.alive) return;

            for (let id in this.world.players) {
                let other = this.world.players[id];
                if (this.player.id === other.id) continue;
                if (this.player.team === other.team && !this.world.friendlyFire) continue;

                // Collision using with point vs rectangle check
                // Check collision near the 'end' of the sword
                let steps = 10;
                for (let i = 8; i <= steps; i++) {
                    let hitX = this.player.x + Math.cos(this.angle) * ATTACK_LENGTH / steps * i;
                    let hitY = this.player.y + Math.sin(this.angle) * ATTACK_LENGTH / steps * i;
                    let hitBounds = { x: hitX, y: hitY };

                    if (this.world.collidesObject(hitBounds, hitBounds, other.getFullTopLeft(), other.getFullBottomRight())) {
                        this.damagePlayer(other);
                        break;
                    }
                }
            }
        }, ATTACK_DELAY);
    }

    damagePlayer(player) {
        player.vx += Math.cos(this.angle) * PUSH_BACK;
        player.vy += Math.sin(this.angle) * PUSH_BACK;
        player.setHealth(player.getHealth() - Sword.SWORD_DAMAGE);
    }

    update(delta) {
        if (this.cooldown > 0) {
            this.cooldown -= delta;
            if (this.cooldown < 0) {
                this.cooldown = 0;
                this.active = false;
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

        // Only give the cooldown info to the player if its the owner of the sword
        if (toId === this.player.id) {
            rep = Object.assign(rep, {
                cooldown: this.cooldown,
            });
        }

        if (this.active) {
            rep = Object.assign(rep, {
                angle: this.angle,
            });
        }

        return rep;
    }
}
