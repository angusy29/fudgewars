import * as Assets from '../assets';
import * as io from 'socket.io-client';
import Player from './player';

/*
 * The actual game client
 */
export default class Game extends Phaser.State {
    private map: Phaser.Tilemap;
    private characterFrames: any[] = [151, 152, 168, 169, 185];
    private socket: any;
    private players: any = {};
    private isDown: any = {};
    private nextFrame = 0;

    // unneeded shit
    private testKey: Phaser.Key;

    public init(): void {

        this.game.stage.disableVisibilityChange = true;
        this.socket = io.connect();

        this.socket.on('update', (data: any) => {
            for (let player of data) {
                if (!this.players[player.id]) {
                    this.addNewPlayer(player);
                }
                this.players[player.id].sprite.x = player.x;
                this.players[player.id].sprite.y = player.y;

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
            delete this.players[id];
        });
    }

    /*
     *  getNextFrame()
     *  Returns: A random character avatar
     */
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
            let sprite = this.game.add.sprite(player.x, player.y, 'p2_walk');
            sprite.animations.add('walk');
            this.players[player.id] = new Player(player.id, sprite);
        }
        // this.playerMap[id].anchor.setTo(0.5, 0.5);
    }

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
        this.socket.emit('join_game');
    }

    public preload(): void {
        // load the map
        this.game.load.tilemap('world', null, this.game.cache.getJSON('mymap'), Phaser.Tilemap.TILED_JSON);
        // this.game.load.spritesheet('bluesheet', 'assets/spritesheets/p2_walk.png', 70, 94, 11);
        // this.game.load.spritesheet('redsheet', 'assets/spritesheets/p3_walk.png', 70, 94, 11);
    }
}
