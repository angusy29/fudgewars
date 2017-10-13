let utils = require('./utils');

const BASE_PLAYER_COLLISION_THRESHOLD = 40;
const FLAG_PLAYER_COLLISION_THRESHOLD = 38;
const FLAG_CAPTURED_POS_X_OFFSET = 15;
const FLAG_CAPTURED_POS_Y_OFFSET = 22;
const PLAYER_ANCHOR_Y_OFFSET = 20;

module.exports = class Flag {
    constructor(world, x, y, colorIdx) {
        this.world = world;
        this.x = x;
        this.y = y;
        this.colorIdx = colorIdx;
        this.carryingBy = null;
        this.isCaptured = false;
    }

    updatePos(x, y) {
        if (this.carryingBy != null) {
            this.setPos(x + FLAG_CAPTURED_POS_X_OFFSET,
                        y + FLAG_CAPTURED_POS_Y_OFFSET);
        }
    }

    setPos(x, y) {
        this.x = x;
        this.y = y;
    }

    update(seconds) {
        for (let id in this.world.players) {
            let player = this.world.players[id];

            // only check if the flag is not captured by any player
            // and the player is not carrying any flag
            if (this.carryingBy === null && !this.isCaptured && player.carryingFlag === null) {
                // check if the player is close enough to the flag
                if (utils.distance(player.x, player.y, this.x, this.y) < FLAG_PLAYER_COLLISION_THRESHOLD) {
                    // if the player is close enough with the flag
                    // they can capture(carry) the flag
                    this.carryingBy = player.id;
                    this.isCaptured = true;
                    player.carryingFlag = this.colorIdx;
                }
            } else if (this.carryingBy !== null && this.isCaptured &&
                (player.x >= this.world.basePos.x-BASE_PLAYER_COLLISION_THRESHOLD &&
                 player.x <= this.world.basePos.x+BASE_PLAYER_COLLISION_THRESHOLD &&
                 player.y >= this.world.basePos.y-BASE_PLAYER_COLLISION_THRESHOLD &&
                 player.y <= this.world.basePos.y+BASE_PLAYER_COLLISION_THRESHOLD)) {
                // flag is with in the basePos area

                this.setPos(player.x, player.y+PLAYER_ANCHOR_Y_OFFSET);
                this.carryingBy = null;
                player.carryingFlag = null;
            }

            if (this.isCaptured && this.carryingBy === player.id) {
                // sync the position of the flag the player if captured
                this.updatePos(player.x, player.y);
            }
        }
    }

    getRep() {
        return {
            colorIdx: this.colorIdx,
            x: this.x,
            y: this.y,
            isCaptured: (this.isCaptured && this.carryingBy !== null),
            carryingBy: this.carryingBy,
        }
    }
}
