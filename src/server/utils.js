exports.randomInt = function(low, high) {
    return Math.floor(Math.random() * (high - low) + low);
}

exports.clamp = function(low, high, value) {
    if (value > high) {
        value = high;
    } else if (value < low) {
        value = low;
    }
    return value;
}

exports.distance = function(x1, y1, x2, y2) {
    let xDist = Math.pow(x1 - x2, 2);
    let yDist = Math.pow(y1 - y2, 2);
    let distance = Math.sqrt(xDist + yDist);
    return distance;
}

return module.exports;
