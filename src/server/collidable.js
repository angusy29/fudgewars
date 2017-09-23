module.exports = class Collidable {
    constructor(world, x, y, bounds) {
        this.world = world;
        this.x = x;
        this.y = y;
        this.bounds = bounds;
    }

    getTopLeft() {
        return {
            x: this.x - this.bounds.left,
            y: this.y - this.bounds.top
        };
    }

    getBottomRight() {
        return {
            x: this.x + this.bounds.right,
            y: this.y + this.bounds.bottom
        };
    }
}
