import * as Assets from '../assets';
import * as io from 'socket.io-client';
import Player from './player';
import Flag from './flag';

/*
 * The actual game client
 */
export default class Game extends Phaser.State {
    private map: Phaser.Tilemap;
    private socket: any;
    private players: any = {};
    private flags: Flag[] = [];
    private flagGroup: Phaser.Group = null;
    private isDown: any = {};
    private nextFrame = 0;
    private terrainLayer: Phaser.TilemapLayer;

    static readonly PLAYER_NAME_Y_OFFSET = 24;

    // need to give it to create()
    private client_player_name: string;

    public init(playername: string): void {
        this.game.stage.disableVisibilityChange = true;
        this.flagGroup = this.game.add.group();
        this.client_player_name = playername;

        this.socket = io.connect();

        this.socket.on('loaded', (data: any) => {
            this.loadTerrain(data.terrain);
            this.loadFlags(data.flags);
        });

        this.socket.on('update', (data: any) => {
            for (let player of data) {
                if (!this.players[player.id]) {
                    this.addNewPlayer(player);
                }

                this.players[player.id].sprite.x = player.x;
                this.players[player.id].sprite.y = player.y;
                this.players[player.id].name.x = player.x;
                this.players[player.id].name.y = player.y - Game.PLAYER_NAME_Y_OFFSET;
                this.updateSpriteDirection(player);

                if (player.vx || player.vy) {
                    this.players[player.id].sprite.animations.play('walk', 20, true);
                } else {
                    this.players[player.id].sprite.animations.stop(null, true);
                }
            }
        });

        this.socket.on('player_left', (id: number) => {
            console.log('player left');
            this.players[id].sprite.destroy();
            this.players[id].name.destroy();
            delete this.players[id];
        });

        this.socket.on('capture_flag', (flagId) => {
            console.log('capture_flag');
            this.flags[flagId].setFlagDown();
        });
    }

    /*
     * Flips the player sprite depending on direction of movement
     * player: A player object sent from the server
     */
    private updateSpriteDirection(player: any) {
        // player is moving left
        if (player.left !== 0) {
            // player is facing right
            if (this.players[player.id].getIsFaceRight()) {
                // so we need to flip him
                this.players[player.id].setIsFaceRight(false);
                this.players[player.id].sprite.scale.x *= -1;
            }
        } else if (player.right !== 0) {    // player is moving right
            // player is facing left, so we need to flip him
            if (!this.players[player.id].getIsFaceRight()) {
                this.players[player.id].setIsFaceRight(true);
                this.players[player.id].sprite.scale.x *= -1;
            }
        }
    }

    private getCoordinates(layer: Phaser.TilemapLayer, pointer: Phaser.Pointer): void {
        console.log(layer, pointer);
    }

    /*
     * Adds a new player to the game
     * Creates a sprite for the player and populates list of players
     * on the client
     *
     * player: A player object from the server
     */
    private addNewPlayer(player: any): void {
        // set up sprite
        let sprite = this.game.add.sprite(player.x, player.y, 'p2_walk');
        sprite.anchor.setTo(0.5, 0.5);
        sprite.scale.setTo(0.5);
        sprite.animations.add('walk');
        this.game.physics.enable(sprite, Phaser.Physics.ARCADE);

        // set up label of the player
        let name = this.game.add.text(player.x, player.y - Game.PLAYER_NAME_Y_OFFSET, player.name, {
            font: '12px ' + Assets.GoogleWebFonts.Roboto
        });
        name.anchor.setTo(0.5, 0.5);

        this.players[player.id] = new Player(player.id, name, sprite);
    }

    /*
     * Callback for when key is pressed down
     */
    private onDown(e: KeyboardEvent): void {
        if (this.isDown[e.keyCode]) {
            return;
        }
        this.isDown[e.keyCode] = true;
        switch (e.keyCode) {
            case 87:    // w
                this.socket.emit('keydown', 'up');
                break;
            case 65:    // a
                this.socket.emit('keydown', 'left');
                break;
            case 83:    // s
                this.socket.emit('keydown', 'down');
                break;
            case 68:    // d
                this.socket.emit('keydown', 'right');
                break;
            default:
                break;
        }
    }

    /*
     * Callback for when key is bounced back up
     */
    private onUp(e: KeyboardEvent): void {
        this.isDown[e.keyCode] = false;
        switch (e.keyCode) {
            case 87:    // w
                this.socket.emit('keyup', 'up');
                break;
            case 65:    // a
                this.socket.emit('keyup', 'left');
                break;
            case 83:    // s
                this.socket.emit('keyup', 'down');
                break;
            case 68:    // d
                this.socket.emit('keyup', 'right');
                break;
            default:
                break;
        }
    }

    private loadTerrain(terrain: number[][]): void {
        console.log(terrain);
        let tilemapMapping = {
            0: 16, // Air
            1: 186 // Wall
        };
        // Format terrain data
        let data: string = '';
        let y: any;
        for (y in terrain) {
            let row = terrain[y];
            let x: any;
            for (x in row) {
                let col = row[x];
                col = tilemapMapping[col];
                data += col.toString();
                if (x < row.length - 1) {
                    data +=  ',';
                }
            }
            if (y < terrain.length - 1) {
                data +=  '\n';
            }
        }

        this.game.cache.addTilemap('terrain', null, data, Phaser.Tilemap.CSV);
        let terrainMap: Phaser.Tilemap = this.game.add.tilemap('terrain', 64, 64);
        terrainMap.addTilesetImage('tilesheet', 'world.[64,64]');
        this.terrainLayer = terrainMap.createLayer(0);
    }

    private loadFlags(flags: any): void {
        for (let f of flags) {
            let newFlag = new Flag(this.game, f.x, f.y, f.colorIdx, f.captured);
            this.flags[f.colorIdx] = newFlag;
            this.flagGroup.add(newFlag.sprite);
        }
    }

    public create(): void {
        // this is the tilesheet
        this.map = this.game.add.tilemap('world');
        this.map.addTilesetImage('tilesheet', 'world.[64,64]');



        let layer: Phaser.TilemapLayer;

        for (let i = 0; i < this.map.layers.length; i++) {
            layer = this.map.createLayer(i);
        }
        layer.inputEnabled = true;

        layer.events.onInputUp.add(this.getCoordinates);

        // on down keypress, call onDown function
        // on up keypress, call the onUp function
        this.input.keyboard.addCallbacks(this, this.onDown, this.onUp);
        this.socket.emit('join_game', this.client_player_name);
    }

    public preload(): void {
        // load the map
        this.game.load.tilemap('world', null, this.game.cache.getJSON('mymap'), Phaser.Tilemap.TILED_JSON);
        // this.game.physics.startSystem(Phaser.Physics.ARCADE);
    }

    /* Gets called every frame */
    public update(): void {
        // push flags to the top of all sprites
        this.game.world.bringToTop(this.flagGroup);
    }
}
