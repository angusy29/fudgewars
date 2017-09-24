import Player from './player';
import { Atlases } from '../assets';

const ANIMATION_DELAY = 300;
const ATTACK_LENGTH = 45;

export default class Sword {
    world: any;
    player: Player;
    sprite: Phaser.Sprite;
    angle: number;

    constructor(world: any, player: Player) {
        this.world = world;
        this.player = player;

        // Keys work as good swords!!!
        this.sprite = this.world.add.sprite(this.player.sprite.x, this.player.sprite.y,
                                            Atlases.SpritesheetsItemsSpritesheet.getName(),
                                            Atlases.SpritesheetsItemsSpritesheet.Frames.KeyYellow);
        this.sprite.visible = false;
        this.sprite.anchor.setTo(0, 0.5);
        this.sprite.scale.setTo(1, 0.2);
        this.sprite.width = 0;
        this.angle = 0;
    }

    public destroy(): void {
        this.sprite.destroy();
    }

    public update(swordUpdate: any): void {
        if (this.player.id === this.world.socket.id) {
            this.world.skills.sword.cooldown = swordUpdate.cooldown;
        }

        this.sprite.x = this.player.sprite.x;
        this.sprite.y = this.player.sprite.y;

        if (swordUpdate.active && !this.sprite.visible) {
            this.sprite.angle = swordUpdate.angle * (180 / Math.PI);
            this.angle = this.sprite.angle;
            this.sprite.width = 0;
            this.sprite.visible = true;
            this.play();
        }
    }

    public play(): void {
        let tween = this.world.game.add.tween(this.sprite).to({ width: ATTACK_LENGTH }, ANIMATION_DELAY, Phaser.Easing.Linear.None, true);
        tween.onComplete.add(() => {
            this.sprite.visible = false;
        }, this);
    }
}
