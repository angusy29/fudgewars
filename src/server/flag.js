const FLAG_CAPTURED_POS_X_OFFSET = 15;
const FLAG_CAPTURED_POS_Y_OFFSET = 22;

module.exports = class Flag {

    constructor(x, y, colorIdx) {
        this.x = x;
        this.y = y;
        this.colorIdx = colorIdx;
        this.capturedBy = null;
    }

    updatePos() {
        if (this.capturedBy != null) {
            this.x = this.capturedBy.x + FLAG_CAPTURED_POS_X_OFFSET;
            this.y = this.capturedBy.y + FLAG_CAPTURED_POS_Y_OFFSET;
        }
    }

}