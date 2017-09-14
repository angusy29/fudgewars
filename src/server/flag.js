module.exports = class Flag {
    constructor(x, y, colorIdx) {
        this.x = x;
        this.y = y;
        this.colorIdx = colorIdx;
        this.captured = false;
    }

}