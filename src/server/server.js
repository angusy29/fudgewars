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
    socket.on('room', function(room) {
        // if the room doesn't exist, add it to the bunch of rooms
        if (!(room in allRooms)) {
            // still inefficient because we're creating the world even if the game hasn't started :/
            // agile gods pls fix... jk.
            let lobby = new Lobby(io, room);
            let world = new World(io, room, lobby, 786 * 2, 640 * 2, 64);
            allRooms[room] = { 'lobby': lobby, 'world': world };
        }
        socket.join(room);

        socket.emit('room_created', { 'joinable': !allRooms[room].lobby.isFull() });

        console.log(allRooms);
    });

    // obviously this isn't called all the time
    // so if a room is deleted, and a player was still on lobby screen, it won't update
    socket.on('get_lobbies', () => {
        let all = {};
        for (room in allRooms) {
            // clean up lobbies which have no players
            if (allRooms[room].lobby.isEmpty()) {
                console.log('lobby destroyed!');
                delete allRooms[room];
                continue;
            }
            all[room] = { 'playerCount': allRooms[room].lobby.playerCount, 'blueCount': allRooms[room].lobby.blueCount, 'redCount': allRooms[room].lobby.redCount,
                            'isPlaying': allRooms[room].lobby.isPlaying };
        }
        socket.emit('lobby_selection_update', all);
    });

    socket.on('join_lobby', function(room, name) {
        // console.log(room);
        // console.log(allRooms);
        if (!(room in allRooms)) {
            console.log('Room does not exist!');
            return;
        }

        let lobby = allRooms[room].lobby;
        if (!lobby.isFull()) {
            lobby.addPlayer(socket, name);
            io.sockets.in(room).emit('player_in');
            console.log('let player in');
        }
        lobby.print();
    });

    socket.on('join_game', function(room) {
        if (!(room in allRooms)) {
            console.log('Room does not exist!');
            return;
        }

        let world = allRooms[room].world;
        world.sendInitialData(socket);
        world.addPlayer(socket);
    });
});