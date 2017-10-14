let LobbyPlayer = require('./lobbyplayer');
let Server = require('./server');

const BLUE = 0;
const RED = 1;

module.exports = class Lobby {
    constructor(io, room) {
        this.io = io;
        this.room = room;
        this.max_players_in_each_team = 6;
        this.players = {};      // all the players
        this.playerCount = 0;
        this.redCount = 0;
        this.blueCount = 0;
        this.isPlaying = false;     // is true if players playing in game world

        // initialise blue and red teams, tiles
        this.blue = [];
        this.red = [];
        for (let i = 0; i < this.max_players_in_each_team; i++) {
            this.blue[i] = null;
            this.red[i] = null;
        }

        // spectators
        this.spectators = {};
        this.spectatorCount = 0;
    }

    /*
     * Add a player to the lobby
     * Only need to store the name
     * And send the name to lobby.ts
     *
     * socket: socket of the connecting client
     * name: name of the player
     */
    addPlayer(socket, name) {
        let id = socket.id;

        let team;
        if (this.blueCount <= this.redCount) {
            team = { name: 'blue', color: BLUE }
            this.blueCount++;
        } else {
            team = { name: 'red', color: RED }
            this.redCount++;
        }
        this.playerCount++;
        console.log(this.playerCount);

        let tileIndex = this[team.name].indexOf(null);
        let player = new LobbyPlayer(id, name, tileIndex, team.color);
        this[team.name][tileIndex] = player;
        this.players[id] = player;
        // socket.broadcast.emit('lobby_player_joined', player.getRep());

        this.registerSocketEvents(socket, player);
        this.update();

        // Start updates
        // if (this.timeout == null) {
        //     this.timeout = setInterval(()=>{this.update()}, 30);
        // }
    }

    registerSocketEvents(socket, player) {
        // toggle player ready
        socket.on('player_ready', () => {
            player.isReady = !player.isReady;
            //this.io.emit('lobby_player_ready', player);
            this.update();

            let startGame = true;
            for (let id in this.players) {
                if (this.players[id].isReady === false) {
                    startGame = false;
                    break;
                }
            }

            // everyone is ready so we start the game
            if (startGame === true) {
                clearInterval(this.timeout);
                this.timeout = null;
                this.isPlaying = true;
                this.io.sockets.in(this.room).emit('lobby_start');
            }
        });

        // when the player clicks on a blue panel this gets called
        socket.on('blue_team_change', (tile) => {
            console.log('change blue team');
            // if the tile we want to move to is not empty, return
            if (this.blue[tile] != null) return;
            let oldTile = player.tile;
            if (player.team === RED) {
                // if player was in red team
                this.red[oldTile] = null;
                this.redCount--;
                this.blueCount++;
            } else {
                this.blue[oldTile] = null;
                this.blue[tile] = player;
            }
            player.team = BLUE;
            player.tile = tile;
            this.print();            
            this.io.sockets.in(this.room).emit('player_moved', player);
        });

        // when player clicks on red panel this gets called
        socket.on('red_team_change', (tile) => {
            console.log('change red team');
            // if the tile we want to move to is not empty, return
            if (this.red[tile] != null) return;
            let oldTile = player.tile;            
            if (player.team === BLUE) {     
                // if player was in blue team
                this.blue[oldTile] = null;
                this.blueCount--;
                this.redCount++;
            } else {
                this.red[oldTile] = null;
                this.red[tile] = player;
            }
            player.team = RED;
            player.tile = tile;
            this.print();
            this.io.sockets.in(this.room).emit('player_moved', player);
        });

        // If player control q's out or quits browser
        socket.on('disconnect', () => {
            console.log('lobby disconnected');
            this.removePlayer(socket, player.id, player.tile);
            this.io.sockets.in(this.room).emit('lobby_player_left', player.id);
            this.print();
        });

        // If player clicks on back
        socket.on('lobby_player_back', () => {
            console.log('lobby player back');
            this.removePlayer(socket, player.id, player.tile);
            this.io.sockets.in(this.room).emit('lobby_player_left', player.id);
            this.print();
            // socket.leave(this.room); // doesn't seem to do anything
        });

    }

    /*
     * Removes a player from the lobby
     * id: id of player to remove
     */
    removePlayer(socket, id, tile) {
        if (!this.players[id]) return;
        
        // if tile wasn't passed as an argument, find the tile
        if (tile === undefined) {
            let teamTile;
            if (this.players[id].team === RED) teamTile = this.red;
            if (this.players[id].team === BLUE) teamTile = this.blue;

            for (let tempTile in teamTile) {
                if (teamTile[tempTile] !== null && teamTile[tempTile].id === id) {
                    tile = tempTile;
                    break;
                }
            }
        }

        if (this.blue[tile] !== null && this.blue[tile].id === id) {
            this.blue[tile] = null;
            this.blueCount--;
        }

        if (this.red[tile] !== null && this.red[tile].id === id) {
            this.red[tile] = null;
            this.redCount--;
        }

        this.unsubscribeAll(socket);
        delete this.players[id];
        this.playerCount--;
    }

    addSpectator(socket, name) {
        let id = socket.id;
        this.spectatorCount++;
        this.spectators[id] = { 'name': name };
    } 

    removeSpectator(socket, id) {
        this.unsubscribeAll(socket);
        this.spectatorCount--;
        delete this.spectators[id];
    }

    update() {
        let all = [];
        for (let id in this.players) {
            let player = this.players[id];
            all.push(player);
        }
        this.io.sockets.in(this.room).emit('lobby_update', all)
    }

    /**
     * Unsubscribe from all events
     */
    unsubscribeAll(socket) {
        // can't seem to just chuck it all in 1 array...
        socket.removeAllListeners(['player_ready']); 
        socket.removeAllListeners(['blue_team_change']);
        socket.removeAllListeners(['red_team_change']);
        socket.removeAllListeners(['disconnect']);
        socket.removeAllListeners(['lobby_player_back']);
    }

    /*
     * Returns true if the lobby is full
     * Otherwise false
     */
    isFull() {
        return this.playerCount === (this.max_players_in_each_team * 2);
    }

    isEmpty() {
        return this.playerCount === 0;
    }

    /*
     *  Returns all the players
     */
    getPlayers() {
        return this.players;
    }

    /*
     * Debugging purposes
     */
    print() {
        console.log('===== LOBBY STATUS =====');
        for (var id in this.players) {
            console.log(this.players[id]);
        } 
        console.log();
        console.log('===BLUE TEAM===');
        for (var id in this.blue) {
            if (this.blue[id] !== null) console.log(this.blue[id]);
        }
        console.log();
        console.log('===RED TEAM===');
        for (var id in this.red) {
            if (this.red[id] !== null) console.log(this.red[id]);
        }

        console.log();
    }
}
