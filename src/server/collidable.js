module.exports = class Collidable {
    constructor(x, y, bounds, world) {
        this.x = x;
        this.y = y;
        this.bounds = bounds;
        this.world = world;
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
