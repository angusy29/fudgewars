let utils = require('./utils');
let Player = require('./player');
let Item = require('./item');

const ITEM_PLAYER_COLLISION_THRESHOLD = 18;

module.exports = class CooldownPot extends Item {
    constructor(world, id, x, y) {
        super(world, id, x, y);
    }

    update(seconds) {
        for (let id in this.world.players) {
            let player = this.world.players[id];
            // check if the player is close enough to the pot
            if (utils.distance(player.x, player.y, this.x, this.y) < ITEM_PLAYER_COLLISION_THRESHOLD) {
                player.resetCooldown();
                this.isPickedUp = true;
            }
        }
    }

    getRep() {
        let base = super.getRep();
        base.type = 'cooldown';
        return base;
    }
}
