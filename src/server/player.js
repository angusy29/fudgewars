module.exports = class Player {
    constructor(id, x, y) {
        this.id = id;
        this.x = x;     // position
        this.y = y;
        this.vx = 0;    // velocity
        this.vy = 0;
        this.ix = 0;    // resolved input, -1, 0, 1
        this.iy = 0;
        this.left = 0;
        this.right = 0;
        this.up = 0;
        this.down= 0;
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

    getRep() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            vx: this.vx,
            vy: this.vy
        }
    }
}