import * as Assets from '../assets';
import * as io from 'socket.io-client';
import Player from './player';

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
    private isDown: any = {};

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
            }
        });

        this.socket.on('player_left', (id: number) => {
            console.log('player left');
            this.characterFrames.push(this.players[id].frame);
            this.players[id].sprite.destroy();
            delete this.players[id];
        });


    }

    private getCoordinates(layer: Phaser.TilemapLayer, pointer: Phaser.Pointer): void {
        console.log(layer, pointer);
    }

    private addNewPlayer(player: any): void {
        if (this.characterFrames.length > 0) {
            let frame: number = this.characterFrames.pop();
            let key: string = 'world.[64,64]';
            let sprite = this.game.add.sprite(player.x, player.y, 'world.[64,64]', frame);
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
    }

    public update(): void {
    }
}

