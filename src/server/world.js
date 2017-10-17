let path = require('path');
let maps = path.resolve(__dirname + '/../../assets/json');

let Player = require('./player');
let Flag = require('./flag');
let utils = require('./utils');

const TILE_SIZE = 64;

const BLUE = 0;
const RED = 1;

module.exports = class World {
    constructor(io, lobby, room, gameLength, mapSize, friendlyFire, width, height, tilesize) {
        this.io = io;
        this.lobby = lobby;     // lobby object
        this.room = room;   // room id
        this.gameLength = gameLength ? gameLength * 60 : 300;
        this.mapSize = mapSize;
        this.friendlyFire = friendlyFire;
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
        this.numCaptures = [0, 0];
        this.gameTime = this.gameLength;

        // TODO change map according to map size
        let data = require(maps + '/map.test.json');

        this.world = this.getWorld(data);

        // 0 = air, 1 = wall
        // Use single digits so it's visually easier to modify (all aligned)
        // Add extra numbers for different tilemap indices
        // Where 0 is the only non-collision
        this.terrain = this.getTerrain(data);

        // setup four different color flags
        this.flags = this.getFlagCoords(this.getFlags(data), tilesize);
    }

    getTerrain(data) {
        return data["terrain"];
    }

    getWorld(data) {
        return data["world"];
    }

    getFlags(data) {
        return data["flags"];
    }

    getFlagCoords(data, tilesize) {
        let flags = [];
        for (let i = 0; i < data.length; i++) {
            let f = data[i];
            let startX = f.startX * tilesize;
            let startY = f.startY * tilesize;
            let endX = f.endX * tilesize;
            let endY = f.endY * tilesize;
            let flag = new Flag(this, startX, startY, endX, endY, i);
            flags.push(flag);
        }

        return flags;
    }

    score(team) {
        this.numCaptures[team]++;
        this.io.sockets.in(this.room).emit('score', team);
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
        return this.collidesPlayers(playerId) || this.collidesTerrain(player.getTopLeft(), player.getBottomRight());
    }

    sendInitialData(socket) {
        let playerReps = [];
        for (let id in this.players) {
            playerReps.push(this.players[id].getRep());
        }

        let flagReps = [];
        for (let flag of this.flags) {
            flagReps.push(flag.getRep());
        }

        socket.emit('loaded', {
            world: this.world,
            terrain: this.terrain,
            players: playerReps,
            flags: flagReps,
            scores: this.numCaptures,
            gameTime: this.gameTime,
        });
    }

    addPlayer(socket) {
        let id = socket.id;
        let name = this.lobby.getPlayers()[id].name;
        let team = this.lobby.getPlayers()[id].team;

        let player = new Player(this, id, name, team, 0, 0);
        this.players[id] = player;
        this.playerCount++;
        player.setSpawnPosition();

        this.io.sockets.in(this.room).emit('player_join', player.getRep());
        this.registerSocketEvents(socket, player);

        // Start updates
        if (this.timeout === null) {
            this.timeout = setInterval(() => {this.update()}, 30);
        }
    }

    registerSocketEvents(socket, player) {
        socket.on('keydown', (direction) => {
            player.keydown(direction);
        });

        socket.on('pingcheck', () => {
            socket.emit('pongcheck');
        });

        socket.on('keyup', (direction) => {
            player.keyup(direction);
        });

        socket.on('attack_hook', (angle) => {
            player.useHook(angle);
        });

        socket.on('attack_sword', (angle) => {
            player.useSword(angle);
        });

        socket.on('disconnect', () => {
            this.disconnectPlayer(socket, player);
        });

        // in case the player clicks on quit game, instead of quitting game
        socket.on('game_quit', () => {
            this.disconnectPlayer(socket, player);
        });

        // receive chatroom message from player
        socket.on('chatroom_msg', (msg) => {
            // relay message to other player in the team
            for (let id in this.players) {
                let p = this.players[id]
                if (p.id != player.id && p.team == player.team) {
                    // broadcast message to other player in the same team
                    socket.broadcast.to(p.id).emit('chatroom_msg', {
                        'sender': player.id,
                        'msg' : msg
                    });
                }
            }
        });
    }

    disconnectPlayer(socket, player) {
        // release the flag that is being carry by the player
        if (player.carryingFlag !== null) {
            player.carryingFlag.drop();
        }

        console.log('=====world discon=====');
        this.removePlayer(socket, player.id);
        this.lobby.removePlayer(socket, player.id);
        // socket.leave(this.room);
        this.io.sockets.in(this.room).emit('player_left', player.id);

        // this.lobby.print();
    }

    removePlayer(socket, id) {
        if (!this.players[id]) return;

        socket.removeAllListeners(['keydown']);
        socket.removeAllListeners(['pingcheck']);
        socket.removeAllListeners(['keyup']);
        socket.removeAllListeners(['attack_hook']);
        socket.removeAllListeners(['attack_sword']);
        socket.removeAllListeners(['disconnect']);
        socket.removeAllListeners(['game_quit']);
        delete this.players[id];
        this.playerCount--;

        // Stop updates if no more players
        if (this.playerCount === 0) {
            this.stopGame();
        }
    }

    isEmpty() {
        return this.playerCount === 0;
    }

    // All players left
    stopGame() {
        if (this.timeout) {
            clearInterval(this.timeout);
            this.timeout = null;
        }
    }

    // End of game reached
    finishGame() {
        this.stopGame();
        this.io.sockets.in(this.room).emit('game_end', {
            scores: this.numCaptures,
        });
    }

    update() {
        let seconds = 30/1000;

        this.gameTime -= seconds;
        if (this.gameTime <= 0) {
            // Game over
            this.finishGame();
            return;
        }

        let playerReps = [];
        for (let id in this.players) {
            let player = this.players[id]
            player.update(seconds);
            playerReps.push(player.getRep(id));
        }

        let flagReps = [];
        for (let flag of this.flags) {
            flag.update(seconds);
            flagReps.push(flag.getRep());
        }

        this.io.sockets.in(this.room).emit('update', {
            time: this.gameTime,
            players: playerReps,
            flags:   flagReps
        });
    }
}
