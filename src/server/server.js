let express = require('express');
let app = express();
let server = require('http').Server(app);
let io = require('socket.io').listen(server);
let path = require('path');
let dist = path.resolve(__dirname + '/../../dist');

server.listen(process.env.PORT || 3000);

try {
    app.use('/', express.static(dist + '/'));

    app.get('/', function (req, res) {
        res.sendFile(dist + '/index.html');
    });
} catch (err) {

}

let nextPlayerId = 0;

let board = {
    width: 768,
    height: 640,
    tilewidth: 64,
    tileheight: 64
}

let physics = {
    // TODO: replace with p2 physics engine
    acceleration: 1,
    decceleration: 3,
    velocityLimit: 20,
}

let playerMap = {}

function randomInt (low, high) {
    return Math.floor(Math.random() * (high - low) + low);
}

io.on('connection',function(socket){
    console.log("connecting with player")
    socket.on('join_game',function(){
        // Add player to board
        console.log("join game player")
        socket.player = {
            id: nextPlayerId++,
            x: randomInt(0, board.width - board.tilewidth),
            y: randomInt(0, board.height - board.tileheight),
            xv: 0,     // velocity in x plane
            yv: 0,     // velocity in y plane
        }
        playerMap[socket.player.id] = socket.player;

        socket.emit('all_players', Object.values(playerMap));
        socket.broadcast.emit('player_joined',socket.player);

        socket.on('keydown', function(data) {
            console.log(data);
            // TODO: update player last move
            socket.player.x = data.x;
            socket.player.y = data.y;
        });

        socket.on('keyup',function(data) {
            console.log(data)
        });

        socket.on('disconnect', function() {
            io.emit('player_left', socket.player.id);
            delete playerMap[socket.player.id]
        });
    });


});


