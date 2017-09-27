let LobbyPlayer = require('./lobbyplayer');

module.exports = class Lobby {
    constructor(io) {
        this.io = io;
        this.players = {};      // all the players
        this.red = {};          // red team
        this.blue = {};         // blue team
        this.playercount = 0;
        this.redcount = 0;
        this.bluecount = 0;
        this.max_players_in_each_team = 6;
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

        // add to red team or blue team depending on current size of team
        if (this.bluecount <= this.redcount) {
            // tile must be bluecount
            player = new LobbyPlayer(id, name, this.bluecount, BLUE);
            this.blue[player.id] = player;
            this.bluecount++;
        } else {
            player = new LobbyPlayer(id, name, this.redcount, RED);
            this.red[player.id] = player;
            this.redcount++;
        }

        this.players[id] = player;
        this.playerCount++;
        // socket.broadcast.emit('lobby_player_joined', player.getRep());

        // toggle player ready
        socket.on('player_ready', () => {
            this.players[id].isReady = !this.players[id].isReady;
        });

        socket.on('blue_team_change', (tile) => {
            // console.log('blue moved ' + this.players[id].name + ' ' + BLUE);
            if (this.players[id].team === RED) {
                // if player was in red team
                delete this.red[id]
                this.redcount--;
                this.blue[id] = this.players[id];
            }
            this.players[id].team = BLUE;
            this.players[id].tile = tile;
            // this.print();            
            this.io.emit('player_moved', this.players[id]);
        });

        socket.on('red_team_change', (tile) => {
            // console.log('red moved ' + this.players[id].name + ' ' + RED);
            if (this.players[id].team === BLUE) {
                // if player was in blue team
                delete this.blue[id]
                this.bluecount--;
                this.red[id] = this.players[id];
            }
            this.players[id].team = RED;
            this.players[id].tile = tile;
            // this.print();
            this.io.emit('player_moved', this.players[id]);
        });

        // If player control q's out or quits browser
        socket.on('disconnect', () => {
            console.log('lobby disconnected');
            this.removePlayer(id);
            this.io.emit('lobby_player_left', id);
            this.print();
        });

        // Start updates
        if (this.timeout == null) {
            this.timeout = setInterval(()=>{this.update()}, 30);
        }
    }

    /*
     * Removes a player from the lobby
     * id: id of player to remove
     */
    removePlayer(id) {
        if (id in this.blue) {
            delete this.blue[id];
            this.bluecount--;
        }

        if (id in this.red) {
            delete this.red[id];
            this.redcount--;
        }

        delete this.players[id];
        this.playerCount--;

        // Stop updates if no more players
        if (this.playerCount === 0) {
            clearInterval(this.timeout);
            this.timeout = null;
        }
    }

    update() {
        let all = [];
        let startGame = true;
        for (let id in this.players) {
            let player = this.players[id];
            if (player.isReady === false) startGame = false;
            all.push(player);
        }

        this.io.emit('lobby_update', all)

        // everyone is ready so we start the game
        if (startGame === true) {
            clearInterval(this.timeout);
            this.timeout = null;
            this.io.emit('lobby_start');
        }
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
            console.log(this.blue[id]);
        }
        console.log();
        console.log('===RED TEAM===');
        for (var id in this.red) {
            console.log(this.red[id]);
        }

        console.log();
    }
}