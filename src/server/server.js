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

// =============================================================

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

// =============================================================

lobby = new Lobby(io);
world = new World(io, 768*2, 640*2, 64);

io.on('connection', function(socket) {
    socket.on('join_lobby', function(name) {
        if (!lobby.isFull()) {
            lobby.addPlayer(socket, name);
        }
        lobby.print();
    });

    socket.on('prepare_world', function() {
        socket.on('join_game', function() {
            world.sendInitialData(socket);
            world.addPlayer(socket);
         });
    });
});
