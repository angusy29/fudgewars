import * as Assets from '../assets';
import * as io from 'socket.io-client';

export default class Title extends Phaser.State {
    private googleFontText: Phaser.Text = null;
    private playerMap: any = {};
    private testKey: Phaser.Key;
    private map: Phaser.Tilemap;
    private characterFrames: number[] = [151, 152, 168, 169, 185];
    private socket: any;

    public init(): void {
        this.game.stage.disableVisibilityChange = true;
        this.socket = io.connect();

        this.socket.on('all_players', (data: any) => {
            for (let i = 0; i < data.length; i++) {
                this.addNewPlayer(data[i].id, data[i].x, data[i].y);
            }
            this.socket.on('player_joined', (data: any) => {
                this.addNewPlayer(data.id, data.x, data.y);
            });

            this.socket.on('player_left', (id: number) => {
                this.characterFrames.push(this.playerMap[id].frame);
                this.playerMap[id].destroy();
                delete this.playerMap[id];
            });
        });

        // the server will calculate the new position of the player
        // we need to set it to render it
        this.socket.on('move', (player: any) => {
            this.playerMap[player.id].x = player.x;
            this.playerMap[player.id].y = player.y;
        });
    }

    private getCoordinates(layer: Phaser.TilemapLayer, pointer: Phaser.Pointer): void {
        console.log(layer, pointer);
    }

    private addNewPlayer(id: number, x: number, y: number): void {
        if (this.characterFrames.length > 0) {
            this.playerMap[id] = this.game.add.sprite(x, y, 'world.[64,64]');
            this.playerMap[id].frame = this.characterFrames.pop();
        }
        // this.playerMap[id].anchor.setTo(0.5, 0.5);
    }


    private onDown(a: KeyboardEvent): void {
        console.log('down', a);
        switch (a.keyCode) {
            case 37:    // left
                this.socket.emit('left');
                break;
            case 38:    // up
                this.socket.emit('up');
                break;
            case 39:    // right
                this.socket.emit('right');
                break;
            case 40:    // down
                this.socket.emit('down');
                break;
            default:
                break;
        }
    }
    private onUp(a: KeyboardEvent): void {
        console.log('up', a);

    }

    public create(): void {
        // add enter key listener
        this.testKey = this.game.input.keyboard.addKey(Phaser.Keyboard.ENTER);
        this.testKey.onDown.add(() => {
            console.log('enter key pressed');
        });

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
        this.googleFontText = this.game.add.text(
            this.game.world.centerX,
            this.game.world.centerY - 100, 'Fudge Wars', {
            font: '50px ' + Assets.GoogleWebFonts.Roboto
        });
        this.googleFontText.anchor.setTo(0.5);
        this.socket.emit('join_game');
    }

    public preload(): void {
        this.game.load.tilemap('world', null, this.game.cache.getJSON('mymap'), Phaser.Tilemap.TILED_JSON);
    }

    public update(): void {
    }


}

