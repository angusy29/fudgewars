let utils = require('./utils');
let Collidable = require('./collidable');

const BOUNDS = {
    top: 8,
    right: 8,
    bottom: 8,
    left: 8
};

module.exports = class Item extends Collidable {
    constructor(world, id, x, y) {
        super(world, 0, 0, BOUNDS);
        this.world = world;
        this.id = id;
        this.x = x;
        this.y = y;
        this.isPickedUp = false;
    }

    getRep() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            isPickedUp: this.isPickedUp
        }
    }
}
