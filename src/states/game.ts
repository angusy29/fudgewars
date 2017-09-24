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
    private mapLayer: Phaser.TilemapLayer;
    private terrainLayer: Phaser.TilemapLayer;

    // used to render own client's name green
    private client_id: string;

    static readonly BLUE = 0;
    static readonly RED = 1;

    public init(socket: any): void {
        // this.game.stage.disableVisibilityChange = true;
        this.flagGroup = this.game.add.group();
        this.client_id = socket.id;

        this.socket = socket;

        this.socket.on('loaded', (data: any) => {
            this.loadWorld(data.world);
            this.loadTerrain(data.terrain);
            this.loadFlags(data.flags);

            // Sprite ordering
            this.game.world.sendToBack(this.flagGroup);
            this.game.world.sendToBack(this.terrainLayer);
            this.game.world.sendToBack(this.mapLayer);
        });

        this.socket.on('update', (data: any) => {
            for (let player of data) {
                if (!this.players[player.id]) {
                    this.addNewPlayer(player);
                }

                // update sprite position
                this.players[player.id].sprite.x = player.x;
                this.players[player.id].sprite.y = player.y;
                this.players[player.id].name.x = player.x;
                this.players[player.id].name.y = player.y - Player.PLAYER_NAME_Y_OFFSET;
                // group items are relative to the group object, so we
                // loop through and set each one instead
                this.players[player.id].healthBar.forEach(element => {
                    element.x = player.x - Player.HEALTH_BAR_X_OFFSET;
                    element.y = player.y - Player.HEALTH_BAR_Y_OFFSET;
                });

                /* Sample code on how to decrease health */
                let healthFg = this.players[player.id].healthBar.getChildAt(1);
                if (this.players[player.id].getHealth() > 0) {
                    this.players[player.id].health -= 1;
                    healthFg.width = Player.HEALTHBAR_WIDTH * (this.players[player.id].health / 100);
                }

                this.updateSpriteDirection(player);

                // update player animation, if they are walking
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
            this.players[id].healthBar.destroy();
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
                // so when we flip the sprite, the name gets flipped back to original orientation
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
        let frame;
        if (player.team === Game.BLUE) frame = 'p2_walk';
        if (player.team === Game.RED) frame = 'p3_walk';

        // set up sprite
        let sprite = this.game.add.sprite(player.x, player.y, frame);
        sprite.anchor.setTo(0.5, 0.5);
        sprite.scale.setTo(0.5);
        sprite.animations.add('walk');
        this.game.physics.enable(sprite, Phaser.Physics.ARCADE);

        // set up label of the player
        let name = this.game.add.text(player.x, player.y - Player.PLAYER_NAME_Y_OFFSET, player.name, {
            font: '14px ' + Assets.GoogleWebFonts.Roboto
        });
        name.anchor.setTo(0.5, 0.5);

        // if this is the client's player, set the colour to be limegreen
        if (player.id === this.client_id) {
            name.addColor('#32CD32', 0);
        }

        let healthBar = this.createPlayerHealthBar(player);
        this.players[player.id] = new Player(player.id, name, healthBar, sprite);
    }

    /*
     * Creates the canvas for player health bar
     * player: Player to create health bar for
     *
     * return: A group containing the health bar foreground (green part)
     * and the health bar background (red part), they are indexes 0 and 1
     * respectively
     */
    private createPlayerHealthBar(player: any): Phaser.Group {
        // create health bar canvas
        let healthBMP = this.game.add.bitmapData(Player.HEALTHBAR_WIDTH, 5);
        healthBMP.ctx.beginPath();
        healthBMP.ctx.rect(0, 0, Player.HEALTHBAR_WIDTH, 5);
        healthBMP.ctx.fillStyle = Player.HEALTH_GREEN_COLOUR;
        healthBMP.ctx.fillRect(0, 0, Player.HEALTHBAR_WIDTH, 5);

        let healthBgBMP = this.game.add.bitmapData(Player.HEALTHBAR_WIDTH, 5);
        healthBgBMP.ctx.beginPath();
        healthBgBMP.ctx.rect(0, 0, Player.HEALTHBAR_WIDTH, 5);
        healthBgBMP.ctx.fillStyle = Player.HEALTH_RED_COLOUR;
        healthBgBMP.ctx.fillRect(0, 0, Player.HEALTHBAR_WIDTH, 5);

        // health bar green part
        let healthBarFg = this.game.add.sprite(player.x - Player.HEALTH_BAR_X_OFFSET, player.y - Player.HEALTH_BAR_Y_OFFSET, healthBMP);

        // health bar red part
        let healthBarBg = this.game.add.sprite(player.x - Player.HEALTH_BAR_X_OFFSET, player.y - Player.HEALTH_BAR_Y_OFFSET, healthBgBMP);

        let healthBar = new Phaser.Group(this.game);
        healthBar.addAt(healthBarBg, 0);
        healthBar.addAt(healthBarFg, 1);

        return healthBar;
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
        // Format terrain data
        let data: string = this.parseLayer(terrain);

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

    // public create(): void {
    //     // this is the tilesheet
    //     this.map = this.game.add.tilemap('world');
    //     this.map.addTilesetImage('tilesheet', 'world.[64,64]');

    //     this.game.cache.addTilemap('terrain', null, data, Phaser.Tilemap.CSV);
    //     let terrainMap: Phaser.Tilemap = this.game.add.tilemap('terrain', 64, 64);
    //     terrainMap.addTilesetImage('tilesheet', 'world.[64,64]');

    //     this.terrainLayer = terrainMap.createLayer(0);
    // }

    private loadWorld(world: number[][]): void {
        let data: string = this.parseLayer(world);

        this.game.load.tilemap('world', null, data, Phaser.Tilemap.CSV);
        this.map = this.game.add.tilemap('world', 64, 64);
        this.map.addTilesetImage('tilesheet', 'world.[64,64]');

        let layer: Phaser.TilemapLayer = this.map.createLayer(0);
        this.mapLayer = layer;

        layer.inputEnabled = true;

        layer.events.onInputUp.add(this.getCoordinates);
    }

    private parseLayer(layer: number[][]): string {
        // Format data
        let tilemapMapping = {
            0: 16, // Air
            // 1: 186 // Wall
        };
        let data: string = '';
        let y: any;
        for (y in layer) {
            let row = layer[y];
            let x: any;
            for (x in row) {
                let col = row[x];
                if (col === 0) {
                    col = tilemapMapping[col];
                }
                data += col.toString();
                if (x < row.length - 1) {
                    data +=  ',';
                }
            }
            if (y < layer.length - 1) {
                data +=  '\n';
            }
        }
        return data;
    }

    public create(): void {
        // on down keypress, call onDown function
        // on up keypress, call the onUp function
        this.input.keyboard.addCallbacks(this, this.onDown, this.onUp);
        this.socket.emit('join_game');
    }

    public preload(): void {
        // load the map
        // this.game.load.tilemap('world', null, this.game.cache.getJSON('mymap'), Phaser.Tilemap.TILED_JSON);
        // this.game.physics.startSystem(Phaser.Physics.ARCADE);
    }
}
