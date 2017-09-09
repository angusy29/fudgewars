import * as Assets from '../assets';
import * as io from 'socket.io-client';

export default class Player extends Phaser.Sprite {
    private id: number;
    private socket: any;

    constructor(id: number, game: Phaser.Game, x: number, y: number, key: string, frame: number, socket: any) {
        super(game, x, y, key, frame);
        this.id = id;
        this.socket = socket;
        //this.init_movement();
    }

    // private init_movement(): void {
    //     this.socket.on('move', (player: any) => {
    //         this.x = player.x;
    //         this.y = player.y;
    //         this.animations.sprite.x = player.x;
    //         this.animations.sprite.y = player.y;
    //     });
    // }
}