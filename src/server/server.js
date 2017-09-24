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
let utils = require('./utils');

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
    }

    /**
     * Takes in a two points representing a bounding box which both have an x and y property
     * and tells you if the box collides with the terrain
     */
    collidesTerrain(topLeft, bottomRight) {
        // TODO Is the tilesize 64 or 32?!
        let tilesize = 64;

        let topLeftTile  = { x: Math.floor(topLeft.x / tilesize), y: Math.floor(topLeft.y / tilesize) };
        let bottomRightTile  = { x: Math.floor(bottomRight.x / tilesize), y: Math.floor(bottomRight.y / tilesize) };

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

    }

    collidesObject(topLeft, bottomRight, otherTopLeft, otherBottomRight) {
        let xOverlap = (topLeft.x < otherBottomRight.x) && (bottomRight.x > otherTopLeft.x);
        let yOverlap = (topLeft.y < otherBottomRight.y) && (bottomRight.y > otherTopLeft.y);
        let hasCollision = xOverlap && yOverlap;

        return hasCollision;
    }

    /**
     * Checks collision against other players, given a player id.
     *
     * Returns the other player, if collided, or null.
     */
    collidesPlayers(playerId) {
        let player = this.players[playerId];
        if (player === undefined) return false;

        for (let id in this.players) {
            let other = this.players[id];

            if (playerId === other.id) continue;

            if (this.collidesObject(player.getTopLeft(), player.getBottomRight(),
                                    other.getTopLeft(), other.getBottomRight())) {
                return other;
            }
        }

        return null;
    }

    collides(playerId) {
        let player = this.players[playerId]
        if (player === undefined) return false;
        return this.collidesPlayers(playerId) || this.collidesTerrain(player.getTopLeft(), player.getBottomRight())
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
        let spawnPointCollides = false;

        let player = new Player(this, id, name, 0, 0);
        this.players[id] = player;
        this.playerCount++;

        do {
            x = utils.randomInt(this.left, this.right);
            y = utils.randomInt(this.top, this.bottom);
            player.x = x;
            player.y = y;
            spawnPointCollides = this.collides(id);
        } while (spawnPointCollides);

        socket.broadcast.emit('player_joined', player.getRep());

        socket.on('keydown', function(direction) {
            player.keydown(direction);
        });

        socket.on('keyup', function(direction) {
            player.keyup(direction);
            io.emit('player_stop', id);
        });

        socket.on('hook', function(angle) {
            player.startHooking(angle);
        });

        socket.on('disconnect', () => {
            this.removePlayer(id)
            io.emit('player_left', id);
        });

        // Start updates
        if (this.timeout == null) {
            this.timeout = setInterval(() => {this.update()}, 30);
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

            player.update(seconds);

            // determine if the player is capturing the flag
            for (let f of this.flags) {
                if (utils.distance(player.x, player.y, f.x, f.y) < FLAG_COLLISION_THRESHOLD) {
                    f.captured = true;
                    io.emit('capture_flag', f.colorIdx);
                }
            }

            all.push(player.getRep(id));
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
