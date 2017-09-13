import * as Assets from '../assets';
import * as io from 'socket.io-client';
import Player from './player';
import Flag from './flag';

/*
 * The actual game client
 */
export default class Game extends Phaser.State {
    private googleFontText: Phaser.Text = null;
    private testKey: Phaser.Key;
    private map: Phaser.Tilemap;
    private characterFrames: any[] = [151, 152, 168, 169, 185];
    private socket: any;
    private players: any = {};
    private flags: Flag[] = [];
    private flagGroup: Phaser.Group = null;
    private isDown: any = {};
    private nextFrame = 0;

    public init(): void {

        this.game.stage.disableVisibilityChange = true;
        this.flagGroup = this.game.add.group();
        
        
        this.socket = io.connect();

        this.socket.on('update', (data: any) => {
            for (let player of data) {
                if (!this.players[player.id]) {
                    this.addNewPlayer(player);
                }
                this.players[player.id].sprite.x = player.x;
                this.players[player.id].sprite.y = player.y;
            }
        });

        this.socket.on('player_left', (id: number) => {
            console.log('player left');
            // this.characterFrames.push(this.players[id].frame);
            this.players[id].sprite.destroy();
            delete this.players[id];
        });


        this.socket.on('init_flags', (flags) => {
            for (let f of flags) {
                let newFlag = new Flag(this.game, f.x, f.y, f.colorIdx, f.captured);
                this.flags[f.colorIdx] = newFlag;
                this.flagGroup.add(newFlag.sprite);
            }
            
        });

        this.socket.on('capture_flag_ack', (flagId) => {
            console.log('capture_flag_ack');
            this.flags[flagId].setFlagDown();
        });
    }
    
    private getNextFrame() {
        this.nextFrame = (this.nextFrame + 1) % 5;
        return this.characterFrames[this.nextFrame];
    }
    
    private getCoordinates(layer: Phaser.TilemapLayer, pointer: Phaser.Pointer): void {
        console.log(layer, pointer);
    }
    
    private addNewPlayer(player: any): void {
        if (this.characterFrames.length > 0) {
            let frame: number = this.getNextFrame();
            let key: string = 'world.[64,64]';
            let sprite = this.game.add.sprite(player.x, player.y, 'world.[64,64]', frame);
            sprite.anchor.setTo(0.5, 1);
            this.game.physics.enable(sprite, Phaser.Physics.ARCADE);
            this.players[player.id] = new Player(player.id, sprite);
        }

    }

    private onDown(e: KeyboardEvent): void {
        if (this.isDown[e.keyCode]) {
            return;
        }
        this.isDown[e.keyCode] = true;
        switch (e.keyCode) {
            case 37:
                this.socket.emit('keydown', 'left');
                break;
            case 38:
                this.socket.emit('keydown', 'up');
                break;
            case 39:
                this.socket.emit('keydown', 'right');
                break;
            case 40:
                this.socket.emit('keydown', 'down');
                break;
            default:
                break;
        }
    }

    private onUp(e: KeyboardEvent): void {
        this.isDown[e.keyCode] = false;
        switch (e.keyCode) {
            case 37:
                this.socket.emit('keyup', 'left');
                break;
            case 38:
                this.socket.emit('keyup', 'up');
                break;
            case 39:
                this.socket.emit('keyup', 'right');
                break;
            case 40:
                this.socket.emit('keyup', 'down');
                break;
            default:
                break;
        }
    }

    public create(): void {
        
        // add enter key listener
        this.testKey = this.game.input.keyboard.addKey(Phaser.Keyboard.ENTER);
        this.testKey.onDown.add(() => {
            console.log('enter key pressed');
        });
        
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

        // render the title
        this.googleFontText = this.game.add.text(
            this.game.world.centerX,
            this.game.world.centerY - 100, 'Fudge Wars', {
            font: '50px ' + Assets.GoogleWebFonts.Roboto
        });
        this.googleFontText.anchor.setTo(0.5);
        this.socket.emit('join_game');
    }
    
    public preload(): void {
        // load the map
        this.game.load.tilemap('world', null, this.game.cache.getJSON('mymap'), Phaser.Tilemap.TILED_JSON);
        this.game.physics.startSystem(Phaser.Physics.ARCADE);
    }
    
    public update(): void {
        // push flags to the top of all sprites
        this.game.world.bringToTop(this.flagGroup);
    
        // implement collision detection between players and flags
        for (let playerKey of Object.keys(this.players)) {
            let player = this.players[playerKey];
            for (let flag of this.flags) {
                if (flag.isFlagUp) {
                    this.game.physics.arcade.collide(player.sprite, flag.sprite,
                        (obj1, obj2) => {
                            // collision callback
                            this.socket.emit('capture_flag', flag.id);
                        },
                        (obj1, obj2) => {
                            // process callback
                            return true;
                        },
                    this);
                }
            }
        }
    }
}

