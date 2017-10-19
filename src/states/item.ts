import * as Assets from '../assets';
import Game from './game';

// Server decides to spawn an item
// Server decides if its a health potion, a cooldown potion or a speed boost
// Server picks a coordinate to spawn the item
// Client updates and renders the item on screen
// Player collides with the item
export default class Item {
    private game: Game;
    private sprite: Phaser.Sprite;

    constructor(game: Game, x: number, y: number, key: string) {
        this.game = game;
        this.sprite = game.add.sprite(x, y, key);
        this.sprite.anchor.setTo(0.5 ,0.5);

        this.game.add.tween(this.sprite).to({ y: this.sprite.y + 4 }, 500, "Circ", true, 0, -1, true);
    }

    public destroy(): void {
        this.sprite.destroy();
    }
}
