import Player from './player';
import { Atlases } from '../assets';

export default class Hook {
    game: Phaser.State;
    player: Player;
    sprite: Phaser.Sprite;
    chainSprite: Phaser.Sprite;
    active: boolean;
    g: Phaser.Graphics;

    constructor(game: Phaser.State, player: Player) {
        this.game = game;
        this.player = player;
        this.sprite = this.game.add.sprite(0, 0,
                                           Atlases.SpritesheetsItemsSpritesheet.getName(),
                                           Atlases.SpritesheetsItemsSpritesheet.Frames.Spikes);
        this.sprite.visible = false;
        this.active = false;
        this.sprite.anchor.setTo(0.5, 1);
        this.sprite.scale.setTo(0.1, 0.5);
        this.g = this.game.add.graphics(0, 0);
    }

    public destroy(): void {
        this.sprite.destroy();
        this.g.clear();
    }

    public update(hookUpdate: any): void {
        this.g.clear();
        if (hookUpdate) {
            this.sprite.visible = true;
            this.sprite.x = hookUpdate.x;
            this.sprite.y = hookUpdate.y;
            this.sprite.angle = hookUpdate.angle * (180 / Math.PI) + 90;

            this.g.lineStyle(1, 0x0088FF, 1);
            this.g.moveTo(this.sprite.x, this.sprite.y);
            this.g.lineTo(this.player.sprite.x, this.player.sprite.y);
            this.game.world.bringToTop(this.sprite);
        } else {
            this.sprite.visible = false;
        }
    }
}
