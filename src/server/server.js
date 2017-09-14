let express = require('express');
let app = express();
let server = require('http').Server(app);
let io = require('socket.io').listen(server, {
    pingInterval: 1000,
    pingTimeout: 1000,
    cookie: false
  });
let path = require('path');
let dist = path.resolve(__dirname + '/../../dist');

const FLAG_COLLISION_THRESHOLD = 40;
let Player = require('./player');
let Flag = require('./flag');

server.listen(process.env.PORT || 8081, function(){
    console.log('Listening on ' + server.address().port);
});

try {
    app.use('/', express.static(dist + '/'));

    app.get('/', function (req, res) {
        res.sendFile(dist + '/index.html');
    });
} catch (err) {

}

function randomInt (low, high) {
    return Math.floor(Math.random() * (high - low) + low);
}

function clamp(low, high, value) {
    if (value > high) {
        value = high;
    } else if (value < low) {
        value = low;
    }
    return value;
}

class World {
    constructor(width, height, tilesize) {
        this.width = width;
        this.height = height;
        this.tilesize = tilesize;
        this.top = 0 + tilesize/2;
        this.bottom = height - tilesize/2;
        this.left = 0 + tilesize/2;
        this.right = width - tilesize/2;
        this.players = {};
        this.playerCount = 0;
        this.max_velocity = 600     // px/s
        this.acceleration = 600     // px/s/s
        this.decceleration = 1000   // px/s/s
        this.timeout = null;

        // setup four different color flags
        this.flags = [
            new Flag(tilesize,tilesize,0),
            new Flag(width-tilesize,height-tilesize,1),
            new Flag(width-tilesize,tilesize,2),
            new Flag(tilesize,height-tilesize,3)
        ];

        // 0 = air, 1 = wall
        // Use single digits so it's visually easier to modify (all aligned)
        // Add extra numbers for different tilemap indices
        // Where 0 is the only non-collision
        this.terrain = [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                        [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
                        [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0],
                        [0, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0],
                        [0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0],
                        [0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0],
                        [0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0],
                        [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                        [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
                        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]];

        // Bounds determined by the sprite
        this.playerBounds = {
            top: 0,
            right: 10,
            bottom: 24,
            left: 10
        };
    }

    collides(playerId, x, y, bounds=this.playerBounds) {
        let topBound = y - bounds.top;
        let rightBound = x + bounds.right;
        let bottomBound = y + bounds.bottom;
        let leftBound = x - bounds.left;

        // TODO Is the tilesize 64 or 32?!
        let topLeftTile  = { x: Math.floor(leftBound / 64), y: Math.floor(topBound / 64) };
        let bottomRightTile  = { x: Math.floor(rightBound / 64), y: Math.floor(bottomBound / 64) };

        for (let y = topLeftTile.y; y <= bottomRightTile.y; y++) {
            for (let x = topLeftTile.x; x <= bottomRightTile.x; x++) {
                try {
                    let tile = this.terrain[y][x];
                    if (tile !== 0) {
                        return true;
                    }
                } catch (e) {
                    // Out of map boundary
                    return true;
                }
            }
        }

        for (let id in this.players) {
            let other = this.players[id];

            if (playerId === other.id) continue;

            let otherTopBound = other.y - bounds.top;
            let otherRightBound = other.x + bounds.right;
            let otherBottomBound = other.y + bounds.bottom;
            let otherLeftBound = other.x - bounds.left;
            let xOverlap = (leftBound < otherRightBound) && (rightBound > otherLeftBound);
            let yOverlap = (topBound < otherBottomBound) && (bottomBound > otherTopBound);
            let collision = xOverlap && yOverlap;
            if (collision) {
                return true;
            }
        }

        return false;
    }

    sendInitialData(socket) {
        socket.emit('loaded', {
            terrain: this.terrain,
            flags: this.flags
        });
    }

    addPlayer(socket) {
        let id = socket.id;
        let x;
        let y;
        do {
            x = randomInt(this.left, this.right);
            y = randomInt(this.top, this.bottom);
        } while (this.collides(id, x, y));
        let player = new Player(id, x, y);
        this.players[id] = player;
        this.playerCount++;
        socket.broadcast.emit('player_joined', player.getRep());

        socket.on('capture_flag', (flagId) => {
            // check if the collision is valid
            if (flagId < 0 || flagId >= this.flags.length)
                return; // ignore the collision;
            let xDist = Math.pow(this.flags[flagId].x - player.x, 2);
            let yDist = Math.pow(this.flags[flagId].y - player.y, 2);
            // check if the player is close enough to the flag
            if (Math.sqrt(xDist + yDist) < FLAG_COLLISION_THRESHOLD) {
                io.emit('capture_flag_ack', flagId);
                this.flags[flagId].captured = true;
            }
        });

        socket.on('keydown', function(direction) {
            player.keydown(direction);
        });

        socket.on('keyup',function(direction) {
            player.keyup(direction);
            io.emit('player_stop', id);
        });

        socket.on('disconnect', () => {
            this.removePlayer(id)
            io.emit('player_left', id);
        });

        // Start updates
        if (this.timeout == null) {
            this.timeout = setInterval(()=>{this.update()}, 30);
        }
    }

    removePlayer(id) {
        delete this.players[id];
        this.playerCount--;

        // Stop updates if no more players
        if (this.playerCount === 0) {
            clearInterval(this.timeout)
            this.timeout = null
        }
    }

    update() {
        let all = [];
        for (let id in this.players) {
            let player = this.players[id]
            let seconds = 30/1000
            // Update velocity
            let accel = seconds * this.acceleration
            let deccel = seconds * this.decceleration
            if (player.vx !== 0 && Math.sign(player.ix) !== Math.sign(player.vx)) {
                if (player.vx > deccel || player.vx < -deccel) {
                    player.vx -= deccel * Math.sign(player.vx);
                } else {
                    player.vx = 0;
                }
            } else {
                player.vx += accel * player.ix;
            }
            if (player.vy !== 0 && Math.sign(player.iy) !== Math.sign(player.vy)) {
                if (player.vy > deccel || player.vy < -deccel) {
                    player.vy -= deccel * Math.sign(player.vy);
                } else {
                    player.vy = 0;
                }
            } else {
                player.vy += accel * player.iy;
            }
            // Clamp velocity
            player.vx = clamp(-this.max_velocity, this.max_velocity, player.vx);
            player.vy = clamp(-this.max_velocity, this.max_velocity, player.vy);

            let steps = 5;
            let collideX = false;
            for (let i = 0; i < steps; i++) {
                let oldX = player.x;
                player.x += (player.vx * seconds) / steps;
                player.x = clamp(this.left - this.playerBounds.left, this.right + this.playerBounds.right, player.x);
                if(this.collides(player.id, player.x, player.y)) {
                    player.x = oldX;
                    collideX = true;
                    player.vx = 0;
                }
                let oldY = player.y;
                player.y += (player.vy * seconds) / steps;
                player.y = clamp(this.top + this.playerBounds.top, this.bottom + this.playerBounds.bottom, player.y);
                if(this.collides(player.id, player.x, player.y)) {
                    player.y = oldY;
                    player.vy = 0;
                    if (collideX) {
                        break;
                    }
                }
            }

            all.push(player.getRep());

        }
        io.emit('update', all)
    }

}

world = new World(768, 640, 64);

io.on('connection',function(socket){
    socket.on('join_game',function(){
        world.sendInitialData(socket);
        world.addPlayer(socket);
    });
});
