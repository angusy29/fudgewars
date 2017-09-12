module.exports = class Player {
    constructor(id, x, y) {
        this.id = id;
        this.x = x;     // position
        this.y = y;
        this.vx = 0;    // velocity
        this.vy = 0;
        this.ix = 0;    // input, -1, 0, 1
        this.iy = 0;
    }

    keydown(direction) {
        if (direction === 'up') {
            this.iy = -1;
        } else if (direction === 'down') {
            this.iy = 1;
        } else if (direction === 'left') {
            this.ix = -1
        } else if (direction === 'right') {
            this.ix = 1;
        }
    }

    keyup(direction) {
        if (direction === 'up') {
            this.iy = 0;
        } else if (direction === 'down') {
            this.iy = 0;
        } else if (direction === 'left') {
            this.ix = 0;
        } else if (direction === 'right') {
            this.ix = 0;
        }
    }

    getRep() {
        return {
            id: this.id,
            x: this.x,
            y: this.y
        }
    }
}