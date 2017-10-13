let LobbyPlayer = require('./lobbyplayer');

module.exports = class Lobby {
    constructor(io, room) {
        this.io = io;
        this.room = room;
        this.max_players_in_each_team = 6;
        this.players = {};      // all the players
        this.playercount = 0;
        this.redcount = 0;
        this.bluecount = 0;

        // initialise blue and red teams, tiles
        this.blue = {};
        this.red = {};
        for (let i = 0; i < this.max_players_in_each_team; i++) {
            this.blue[i] = null;
            this.red[i] = null;
        }
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
        const BLUE = 0;
        const RED = 1;

        let id = socket.id;
        let player;
        let tile;

        // add to red team or blue team depending on current size of team
        if (this.bluecount <= this.redcount) {
            // find the next available tile
            for (tile = 0; tile < this.max_players_in_each_team; tile++) {
                if (this.blue[tile] == null) break;
            }
            player = new LobbyPlayer(id, name, tile, BLUE);
            this.blue[player.tile] = player;
            this.bluecount++;
        } else {
            // find the next available tile
            for (tile = 0; tile < this.max_players_in_each_team; tile++) {
                if (this.red[tile] == null) break;
            }
            player = new LobbyPlayer(id, name, tile, RED);
            this.red[player.tile] = player;
            this.redcount++;
        }

        this.players[id] = player;
        this.playerCount++;
        // socket.broadcast.emit('lobby_player_joined', player.getRep());

        // toggle player ready
        socket.on('player_ready', () => {
            player.isReady = !player.isReady;
            //this.io.emit('lobby_player_ready', player);
            this.update();

            let startGame = true;
            for (let id in this.players) {
                let player = this.players[id];
                if (player.isReady === false) startGame = false;
            }
            // everyone is ready so we start the game
            if (startGame === true) {
                clearInterval(this.timeout);
                this.timeout = null;
                this.io.sockets.in(this.room).emit('lobby_start');
            }
        });

        // when the player clicks on a blue panel this gets called
        socket.on('blue_team_change', (tile) => {
            // if the tile we want to move to is not empty, return
            if (this.blue[tile] != null) return;
            let oldTile = this.players[id].tile;
            if (this.players[id].team === RED) {
                // if player was in red team
                this.red[oldTile] = null;
                this.redcount--;
            } else {
                this.blue[oldTile] = null;
                this.blue[tile] = this.players[id];
            }
            this.players[id].team = BLUE;
            this.players[id].tile = tile;
            this.print();            
            this.io.sockets.in(this.room).emit('player_moved', player);
        });

        // when player clicks on red panel this gets called
        socket.on('red_team_change', (tile) => {
            // if the tile we want to move to is not empty, return
            if (this.red[tile] != null) return;
            let oldTile = this.players[id].tile;            
            if (this.players[id].team === BLUE) {     
                // if player was in blue team
                this.blue[oldTile] = null;
                this.bluecount--;
            } else {
                this.red[oldTile] = null;
                this.red[tile] = this.players[id];
            }
            this.players[id].team = RED;
            this.players[id].tile = tile;
            this.print();
            this.io.sockets.in(this.room).emit('player_moved', player);
        });

        // If player control q's out or quits browser
        socket.on('disconnect', () => {
            console.log('lobby disconnected');
            this.removePlayer(player.id, player.tile);
            this.io.sockets.in(this.room).emit('lobby_player_left', player.id);
            this.print();
        });

        // If player clicks on back
        socket.on('lobby_player_back', () => {
            console.log('lobby disconnected');
            this.removePlayer(player.id, player.tile);
            this.io.sockets.in(this.room).emit('lobby_player_left', player.id);
            this.print();
        });

        this.update();

        // Start updates
        // if (this.timeout == null) {
        //     this.timeout = setInterval(()=>{this.update()}, 30);
        // }
    }

    /*
     * Removes a player from the lobby
     * id: id of player to remove
     */
    removePlayer(id, tile) {
        if (this.blue[tile] !== null && this.blue[tile].id === id) {
            this.blue[tile] = null;
            this.bluecount--;
        }

        if (this.red[tile] !== null && this.red[tile].id === id) {
            this.red[tile] = null;
            this.redcount--;
        }

        delete this.players[id];
        this.playerCount--;

        // Stop updates if no more players
        // if (this.playerCount === 0) {
        //     clearInterval(this.timeout);
        //     this.timeout = null;
        // }
    }

    update() {
        let all = [];
        for (let id in this.players) {
            let player = this.players[id];
            all.push(player);
        }
        this.io.sockets.in(this.room).emit('lobby_update', all)
    }

    /*
     * Returns true if the lobby is full
     * Otherwise false
     */
    isFull() {
        return this.playercount == (this.max_players_in_each_team * 2);
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