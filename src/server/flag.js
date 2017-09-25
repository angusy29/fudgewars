const FLAG_CAPTURED_POS_X_OFFSET = 15;
const FLAG_CAPTURED_POS_Y_OFFSET = 22;

module.exports = class Flag {

    constructor(x, y, colorIdx) {
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

}