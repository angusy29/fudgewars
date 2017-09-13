let express = require('express');
let app = express();
let server = require('http').Server(app);
let io = require('socket.io').listen(server);
let path = require('path');
let dist = path.resolve(__dirname + '/../../dist');

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

function randomInt (low, high) {
    return Math.floor(Math.random() * (high - low) + low);
}

function clamp(low, high, value) {
    if (value > high) {
        value = high;
    } else if (value < low) {
        value = low;
    }
    return value;
}

class Player {
    constructor(id, x, y) {
        this.id = id;
        this.x = x;     // position
        this.y = y;
        this.vx = 0;    // velocity
        this.vy = 0;
        this.ix = 0;    // resolved input, -1, 0, 1
        this.iy = 0;
        this.left = 0;
        this.right = 0;
        this.up = 0;
        this.down= 0;
    }

    keydown(direction) {
        if (direction === 'up') {
            this.iy = -1;
            this.up = -1;
        } else if (direction === 'down') {
            this.iy = 1;
            this.down = 1;
        } else if (direction === 'left') {
            this.ix = -1;
            this.left = -1;
        } else if (direction === 'right') {
            this.ix = 1;
            this.right = 1;
        }
    }

    keyup(direction) {
        if (direction === 'up') {
            this.up = 0;
            this.iy = this.down;
        } else if (direction === 'down') {
            this.down = 0
            this.iy = this.up;
        } else if (direction === 'left') {
            this.left = 0;
            this.ix = this.right;
        } else if (direction === 'right') {
            this.right = 0;
            this.ix = this.left;
        }
    }

    getRep() {
        return {
            id: this.id,
            x: this.x,
            y: this.y
        }
    }
}

class World {

    constructor(width, height, tilesize) {
        this.width = width;
        this.height = height;
        this.top = 0;
        this.bottom = height - tilesize;
        this.left = 0;
        this.right = width - tilesize;
        this.players = {};
        this.playerCount = 0;
        this.max_velocity = 600     // px/s
        this.acceleration = 600     // px/s/s
        this.decceleration = 1000   // px/s/s
        this.timeout = null
    }

    addPlayer(socket) {
        let id = socket.id;
        let x = randomInt(this.left, this.right);
        let y = randomInt(this.top, this.bottom);
        let player = new Player(id, x, y);
        this.players[id] = player;
        this.playerCount++;
        socket.broadcast.emit('player_joined', player.getRep());

        socket.on('keydown', function(direction) {
            player.keydown(direction)
        });

        socket.on('keyup',function(direction) {
            player.keyup(direction)
        });

        socket.on('disconnect', () => {
            this.removePlayer(id)
            io.emit('player_left', id);
        });

        // Start updates
        if (this.timeout == null) {
            this.timeout = setInterval(()=>{this.update()}, 30)
        }
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
            // Update velocity
            let accel = seconds * this.acceleration
            let deccel = seconds * this.decceleration
            if (player.vx !== 0 && Math.sign(player.ix) !== Math.sign(player.vx)) {
                if (player.vx > deccel || player.vx < -deccel) {
                    player.vx -= deccel * Math.sign(player.vx);
                } else {
                    player.vx = 0;
                }
            } else {
                player.vx += accel * player.ix;
            }
            if (player.vy !== 0 && Math.sign(player.iy) !== Math.sign(player.vy)) {
                if (player.vy > deccel || player.vy < -deccel) {
                    player.vy -= deccel * Math.sign(player.vy);
                } else {
                    player.vy = 0;
                }
            } else {
                player.vy += accel * player.iy;
            }
            // Clamp velocity
            player.vx = clamp(-this.max_velocity, this.max_velocity, player.vx);
            player.vy = clamp(-this.max_velocity, this.max_velocity, player.vy);

            // Update position
            player.x += player.vx * seconds;
            player.y += player.vy * seconds;

            player.x = clamp(this.left, this.right, player.x);
            player.y = clamp(this.top, this.bottom, player.y);

            all.push(player.getRep());

        }
        io.emit('update', all)
    }

}

world = new World(768, 640, 64);

io.on('connection',function(socket){

    socket.on('join_game',function(){
        // if (world.playerCount < 5) {
            world.addPlayer(socket)
        // }
    });

});
