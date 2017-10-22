let express = require('express');
let http = require('http');
let socketio = require('socket.io');
let path = require('path');

let dist = path.resolve(__dirname + '/../../dist');

let Lobby = require('./lobby');
let World = require('./world');


let app = express();
let server = http.Server(app);
let io  = socketio.listen(server, {
    cookie: false
});

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

// let lob = new Lobby(io, 'Newton');
// let allRooms = { 'Newton': { 'lobby': lob, 'world': new World(io, 'Newton', lob, 786 * 2, 640 * 2, 64) } };

let allRooms = {};

io.on('connection', function(socket) {
    socket.on('room', function(data) {
        // if the room doesn't exist, add it to the bunch of rooms
        if (!(data.room in allRooms)) {
            // still inefficient because we're creating the world even if the game hasn't started :/
            // agile gods pls fix... jk.
            let lobby = new Lobby(io, data.room);
            let world = new World(io, lobby, data.room, data.gameLength, data.mapSize, data.friendlyFire, 786 * 2, 640 * 2, 64);
            allRooms[data.room] = { 'lobby': lobby, 'world': world };
        } else if (data.room in allRooms && data.isCreating) {
            // room already exists
            socket.emit('room_already_exists');
            return;
        }
        socket.join(data.room);

        socket.emit('room_join', { 'joinable': !allRooms[data.room].lobby.isFull() });

        // console.log(allRooms);
    });

    // obviously this isn't called all the time
    // so if a room is deleted, and a player was still on lobby screen, it won't update
    socket.on('get_lobbies', () => {
        let all = {};
        for (let roomId in allRooms) {
            // clean up lobbies which have no players
            let room = allRooms[roomId];
            let lobby = room.lobby;
            let world = room.world;

            if (lobby.isEmpty() && Object.keys(lobby.spectators).length === 0) {
                // console.log('lobby destroyed!');
                delete allRooms[roomId];
                continue;
            }

            if (!lobby.isEmpty() || (lobby.isEmpty() && !world.started)) {
                if (world.gameTime > 0) {
                    all[roomId] = {
                        playerCount: lobby.playerCount,
                        blueCount: lobby.blueCount,
                        redCount: lobby.redCount,
                        isPlaying: lobby.isPlaying,
                    };
                }
            }
        }
        socket.emit('lobby_selection_update', all);
    });

    socket.on('join_lobby', function(room, name) {
        // console.log(room);
        // console.log(allRooms);
        if (!(room in allRooms)) {
            // console.log('Room does not exist!');
            return;
        }

        let lobby = allRooms[room].lobby;
        if (!lobby.isFull()) {
            lobby.addPlayer(socket, name);
            io.sockets.in(room).emit('player_in');
            // console.log('let player in');
        }
        // lobby.print();
    });

    socket.on('join_game', function(room) {
        if (!(room in allRooms)) {
            // console.log('Room does not exist!');
            return;
        }

        let lobby = allRooms[room].lobby;
        let world = allRooms[room].world;
        world.started = true;
        if (world.gameTime <= 0) {
            // console.log('Game over');
            return;
        }

        world.sendInitialData(socket);

        if (lobby.players[socket.id]) {
            world.addPlayer(socket, lobby.getPlayers()[socket.id].accessoryTile);
        } else if (lobby.spectators[socket.id]) {
            world.addSpectator(socket);
        }
    });
});
