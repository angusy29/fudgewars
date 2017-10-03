let express = require('express');
let app = express();
let server = require('http').Server(app);
let io = require('socket.io').listen(server, {
    cookie: false
  });
let path = require('path');
let dist = path.resolve(__dirname + '/../../dist');
let maps = path.resolve(__dirname + '/../../assets/json');

const FLAG_PLAYER_COLLISION_THRESHOLD = 38;
const BASE_PLAYER_COLLISION_THRESHOLD = 40;
const PLAYER_ANCHOR_Y_OFFSET = 20;
const TILE_SIZE = 64;

let Player = require('./player');
let Flag = require('./flag');
let utils = require('./utils');
let Lobby = require('./lobby');

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
        this.basePos = {
            y: 2 * TILE_SIZE + TILE_SIZE*0.32,
            x: 8 * TILE_SIZE + TILE_SIZE*0.4
        };

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
            if (!other.alive) continue;

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

    addPlayer(socket) {
        let id = socket.id;

        let name = lobby.getPlayers()[id].name;
        let team = lobby.getPlayers()[id].team;

        let player = new Player(this, id, name, team, 0, 0);
        this.players[id] = player;
        this.playerCount++;

        // Find spawn point that isnt colliding with anything
        let spawnPointCollides = false;
        do {
            let x = utils.randomInt(this.left, this.right);
            let y = utils.randomInt(this.top, this.bottom);
            player.x = x;
            player.y = y;
            spawnPointCollides = this.collides(id);
        } while (spawnPointCollides);

        // socket.broadcast.emit('player_joined', player.getRep());

        socket.on('keydown', function(direction) {
            player.keydown(direction);
        });

        socket.on('pingcheck', function(nothing) {
            socket.emit('pongcheck');
        });


        socket.on('keyup', function(direction) {
            player.keyup(direction);
        });

        socket.on('attack_hook', function(angle) {
            player.useHook(angle);
        });

        socket.on('attack_sword', function(angle) {
            player.useSword(angle);
        });

        socket.on('disconnect', () => {
            // release the flag that is being carry by the player
            if (player.carryingFlag != null) {
                this.flags[player.carryingFlag].carryingBy = null;
                this.flags[player.carryingFlag].isCaptured = false;
            }

            console.log('=====world discon=====');
            this.removePlayer(id)
            io.emit('player_left', id);
        });

        // Start updates
        if (this.timeout == null) {
            this.timeout = setInterval(() => {this.update()}, 30);
        }
    }

    setRespawnTimer(id) {
        setTimeout(() => {
            let player = this.players[id];
            if (!player) return;

            player.setHealth(Player.MAX_HEALTH);
            io.emit('respawn', id);
        }, Player.RESPAWN_TIME);
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
                // only check if the flag is not captured by any player
                // and the player is not carrying any flag
                if (f.carryingBy == null && !f.isCaptured && player.carryingFlag == null) {
                    // check if the player is close enough to the flag
                    if (utils.distance(player.x, player.y, f.x, f.y) < FLAG_PLAYER_COLLISION_THRESHOLD) {
                        // if the player is close enough with the flag
                        // they can capture(carry) the flag
                        f.carryingBy = player.id;
                        f.isCaptured = true;
                        player.carryingFlag = f.colorIdx;
                    }
                } else if (f.carryingBy != null && f.isCaptured &&
                    (player.x >= this.basePos.x-BASE_PLAYER_COLLISION_THRESHOLD &&
                     player.x <= this.basePos.x+BASE_PLAYER_COLLISION_THRESHOLD &&
                     player.y >= this.basePos.y-BASE_PLAYER_COLLISION_THRESHOLD &&
                     player.y <= this.basePos.y+BASE_PLAYER_COLLISION_THRESHOLD)) {
                    // flag is with in the basePos area

                    f.setPos(player.x, player.y+PLAYER_ANCHOR_Y_OFFSET);
                    f.carryingBy = null;
                    player.carryingFlag = null;
                }

                if (f.isCaptured && f.carryingBy == player.id) {
                    // sync the position of the flag the player if captured
                    f.updatePos(player.x, player.y);
                }
            }
            all.push(player.getRep(id));
        }

        let flagsPos = [];
        for (let f of this.flags) {
            flagsPos.push({
                'colorIdx': f.colorIdx,
                'x': f.x,
                'y': f.y,
                'isCaptured': (f.isCaptured && f.carryingBy != null)
            });
        }

        io.emit('update', {
            'players': all,
            'flags':   flagsPos
        });
    }

}

lobby = new Lobby(io);
world = new World(768*2, 640*2, 64);

io.on('connection',function(socket){
    socket.on('join_lobby', function(name) {
        if (!lobby.isFull()) {
            lobby.addPlayer(socket, name);
        }
        lobby.print();
    });

    socket.on('prepare_world', function() {
        socket.on('join_game', function() {
            world.addPlayer(socket);
            world.sendInitialData(socket);
         });
    });
});
