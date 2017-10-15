let utils = require('./utils');

const BASE_PLAYER_COLLISION_THRESHOLD = 40;
const FLAG_PLAYER_COLLISION_THRESHOLD = 38;
const FLAG_CAPTURED_POS_X_OFFSET = 15;
const FLAG_CAPTURED_POS_Y_OFFSET = 22;
const PLAYER_ANCHOR_Y_OFFSET = 20;

module.exports = class Flag {
    constructor(world, startX, startY, endX, endY, colorIdx) {
        this.world = world;
        this.x = startX;
        this.y = startY;
        this.startX = startX;
        this.startY = startY;
        this.endX = endX;
        this.endY = endY;
        this.colorIdx = colorIdx;
        this.carriedBy = null;
    }

    updatePos(x, y) {
        if (this.carriedBy !== null) {
            this.setPos(x + FLAG_CAPTURED_POS_X_OFFSET,
                        y + FLAG_CAPTURED_POS_Y_OFFSET);
        }
    }

    setPos(x, y) {
        this.x = x;
        this.y = y;
    }

    capturedBy(player) {
        this.carriedBy = player;
        this.setPos(this.carriedBy.x, this.carriedBy.y+PLAYER_ANCHOR_Y_OFFSET);
        player.captureFlag(this);
    }

    drop() {
        this.setPos(this.carriedBy.x, this.carriedBy.y+PLAYER_ANCHOR_Y_OFFSET);
        this.carriedBy.dropFlag();
        this.carriedBy = null;
    }

    score() {
        this.world.score(this.carriedBy.team);

        this.setPos(this.startX, this.startY);
        this.carriedBy.dropFlag();
        this.carriedBy = null;
    }

    update(seconds) {
        if (this.carriedBy === null) {
            for (let id in this.world.players) {
                let player = this.world.players[id];

                // Skip players who are on the same team as the flag
                if (player.team === this.colorIdx) continue;
                if (!player.alive) continue;
                if (player.carryingFlag) continue;

                // check if the player is close enough to the flag
                if (utils.distance(player.x, player.y, this.x, this.y) < FLAG_PLAYER_COLLISION_THRESHOLD) {
                    // if the player is close enough with the flag
                    // they can capture(carry) the flag
                    this.capturedBy(player);
                    break;
                }
            }
        } else if (!this.carriedBy.alive) {
            this.drop();
        } else if (this.carriedBy.x >= this.endX-BASE_PLAYER_COLLISION_THRESHOLD &&
            this.carriedBy.x <= this.endX+BASE_PLAYER_COLLISION_THRESHOLD &&
            this.carriedBy.y >= this.endY-BASE_PLAYER_COLLISION_THRESHOLD &&
            this.carriedBy.y <= this.endY+BASE_PLAYER_COLLISION_THRESHOLD) {
            // flag is with in the basePos area
            this.score();
        } else {
            // sync the position of the flag the player if captured
            this.updatePos(this.carriedBy.x, this.carriedBy.y);
        }
    }

    getRep() {
        return {
            colorIdx: this.colorIdx,
            x: this.x,
            y: this.y,
            carriedBy: this.carriedBy !== null ? this.carriedBy.id : null,
        }
    }
}
