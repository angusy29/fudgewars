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

exports.distance = function(pointA, pointB) {
    let xDist = Math.pow(pointA.x - pointB.x, 2);
    let yDist = Math.pow(pointA.y - pointB.y, 2);
    let distance = Math.sqrt(xDist + yDist);
    return distance;
}

return module.exports;
