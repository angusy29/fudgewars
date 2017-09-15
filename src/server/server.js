let express = require('express');
let app = express();
let server = require('http').Server(app);
let io = require('socket.io').listen(server);
let path = require('path');
let dist = path.resolve(__dirname + '/../../dist');
let maps = path.resolve(__dirname + '/../../assets/json');

const FLAG_COLLISION_THRESHOLD = 40;
let Player = require('./player');
let Flag = require('./flag');

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

function getTerrain(data) {
    return data["terrain"];
}

function getWorld(data) {
    return data["world"];
}

function getFlags(data) {
    return data["flags"];
}

function getFlagCoords(data, tilesize) {
    let flags = [];
    for (let i = 0; i < data.length; i++) {
        let f = data[i];
        flags.push(new Flag(f.x * tilesize, f.y * tilesize, i));
    }

    console.log(flags);

    return flags;
}

class World {
    constructor(width, height, tilesize) {
        this.width = width;
        this.height = height;
        this.top = 0 + tilesize/2;
        this.bottom = height - tilesize/2;
        this.left = 0 + tilesize/2;
        this.right = width - tilesize/2;
        this.players = {};
        this.playerCount = 0;
        this.max_velocity = 600     // px/s
        this.acceleration = 600     // px/s/s
        this.decceleration = 1000   // px/s/s
        this.timeout = null;
    
        let data = require(maps + '/map.test.json');
        this.terrain = getTerrain(data);
        this.world = getWorld(data);

        // setup four different color flags
        this.flags = getFlagCoords(getFlags(data), tilesize);
    }

    initFlags(socket) {
        socket.emit('init_flags',this.flags);
    }

    addPlayer(socket) {
        let id = socket.id;
        let x = randomInt(this.left, this.right);
        let y = randomInt(this.top, this.bottom);
        let player = new Player(id, x, y);
        this.players[id] = player;
        this.playerCount++;
        socket.broadcast.emit('player_joined', player.getRep());

        socket.on('capture_flag', (flagId) => {
            // check if the collision is valid
            if (flagId < 0 || flagId >= this.flags.length)
                return; // ignore the collision;
            let xDist = Math.pow(this.flags[flagId].x - player.x, 2);
            let yDist = Math.pow(this.flags[flagId].y - player.y, 2);
            // check if the player is close enough to the flag
            if (Math.sqrt(xDist + yDist) < FLAG_COLLISION_THRESHOLD) {
                io.emit('capture_flag_ack', flagId);
                this.flags[flagId].captured = true;
            }
        });

        socket.emit('loaded', {
            terrain: this.terrain,
            world: this.world
            // flag: 
        });
    
        socket.on('keydown', function(direction) {
            player.keydown(direction);
        });

        socket.on('keyup',function(direction) {
            player.keyup(direction);
            io.emit('player_stop', id);
        });

        socket.on('disconnect', () => {
            this.removePlayer(id)
            io.emit('player_left', id);
        });

        // Start updates
        if (this.timeout == null) {
            this.timeout = setInterval(()=>{this.update()}, 30);
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
        world.addPlayer(socket);
        world.initFlags(socket);
    });
});
