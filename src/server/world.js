let path = require('path');
let maps = path.resolve(__dirname + '/../../assets/json');

let Player = require('./player');
let Flag = require('./flag');
let utils = require('./utils');

const TILE_SIZE = 64;


module.exports = class World {
    constructor(io, room, lobby, width, height, tilesize) {
        this.io = io;
        this.room = room;   // room id
        this.lobby = lobby;     // lobby object
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
            let flag = new Flag(this, f.x * tilesize, f.y * tilesize, i);
            flags.push(flag);
        }

        return flags;
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

        this.io.sockets.in(this.room).emit('loaded', {
            world: this.world,
            terrain: this.terrain,
            players: playerReps,
            flags: flagReps,
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
            this.io.sockets.in(this.room).emit('pongcheck');
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
            // release the flag that is being carry by the player
            if (player.carryingFlag !== null) {
                let flag = this.flags[player.carryingFlag];
                flag.carryingBy = null;
                flag.isCaptured = false;
            }

            console.log('=====world discon=====');
            this.removePlayer(socket, player.id);
            this.lobby.removePlayer(socket, player.id);
            this.io.sockets.in(this.room).emit('player_left', player.id);
        });

        // in case the player clicks on quit game, instead of quitting game
        socket.on('game_quit', () => {
            // release the flag that is being carry by the player
            if (player.carryingFlag !== null) {
                let flag = this.flags[player.carryingFlag];
                flag.carryingBy = null;
                flag.isCaptured = false;
            }

            console.log('=====world discon=====');
            this.removePlayer(socket, player.id);
            this.lobby.removePlayer(socket, player.id);
            this.io.sockets.in(this.room).emit('player_left', player.id);

            this.lobby.print();
        });
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
            clearInterval(this.timeout);
            this.timeout = null;
        }
    }

    isEmpty() {
        return this.playerCount === 0;
    }

    update() {
        let seconds = 30/1000;

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
            'players': playerReps,
            'flags':   flagReps
        });
    }

}
