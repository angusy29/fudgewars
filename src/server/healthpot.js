let utils = require('./utils');
let Player = require('./player');
let Item = require('./item');

const ITEM_PLAYER_COLLISION_THRESHOLD = 18;

module.exports = class HealthPot extends Item {
    constructor(world, id, x, y) {
        super(world, id, x, y);
    }

    update(seconds) {
        for (let id in this.world.players) {
            let player = this.world.players[id];

            // if (this.world.collidesObject(player.getTopLeft(), player.getBottomRight(),
            //     this.getTopLeft(), this.getBottomRight())) {
            //     player.setHealth(Player.MAX_HEALTH);
            //     this.isPickedUp = true;
            // }

            // check if the player is close enough to the flag
            if (utils.distance(player.x, player.y, this.x, this.y) < ITEM_PLAYER_COLLISION_THRESHOLD) {
                player.setHealth(Player.MAX_HEALTH);
                this.isPickedUp = true;
            }
        }
    }

    getRep() {
        let base = super.getRep();
        base.type = 'health';
        return base;
    }
}
