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
let maps = path.resolve(__dirname + '/../../assets/json');

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

function getTerrain(data) {
    return data["terrain"];
}

function getWorld(data) {
    return data["world"];
}

function getFlags(data) {
    return data["flags"];
}

function getFlagCoords(data, tilesize) {
    let flags = [];
    for (let i = 0; i < data.length; i++) {
        let f = data[i];
        flags.push(new Flag(f.x * tilesize, f.y * tilesize, i));
    }

    return flags;
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
    
        let data = require(maps + '/map.test.json');

        this.world = getWorld(data);
        
        // 0 = air, 1 = wall
        // Use single digits so it's visually easier to modify (all aligned)
        // Add extra numbers for different tilemap indices
        // Where 0 is the only non-collision
        this.terrain = getTerrain(data);

        // setup four different color flags
        this.flags = getFlagCoords(getFlags(data), tilesize);
        
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
            world: this.world,
            terrain: this.terrain,
            flags: this.flags
        });
    }

    addPlayer(socket, name) {
        let id = socket.id;
        let x;
        let y;
        let waiting = false;
        do {
            x = randomInt(this.left, this.right);
            y = randomInt(this.top, this.bottom);
        } while (this.collides(id, x, y));
        let player = new Player(id, name, x, y);
        this.players[id] = player;
        this.playerCount++;
        socket.broadcast.emit('player_joined', player.getRep());

        socket.on('keydown', function(direction) {
            if (player.alive) {
                player.keydown(direction);
            }
        });

        socket.on('keyup',function(direction) {
            player.keyup(direction);
            io.emit('player_stop', id);
        });

        socket.on('dead',function() {
            player.alive = false;
            if (!waiting) {
                waiting = true;
                setTimeout(() => {
                    player.alive = true;
                    io.emit('respawn', player);
                    waiting = false;
                }, 5000);
            }
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

            // determine if the player is capturing the flag
            for (let f of this.flags) {
                let xDist = Math.pow(f.x - player.x, 2);
                let yDist = Math.pow(f.y - player.y, 2);
                // check if the player is close enough to the flag
                if (Math.sqrt(xDist + yDist) < FLAG_COLLISION_THRESHOLD) {
                    f.captured = true;
                    io.emit('capture_flag', f.colorIdx);
                }
            }
           
            all.push(player.getRep());

        }
        io.emit('update', all)
    }

}

world = new World(768, 640, 64);

io.on('connection',function(socket){
    socket.on('join_game', function(name) {
        world.addPlayer(socket, name);
        world.sendInitialData(socket);
    });
});
