import Player from './player';
import { Atlases } from '../assets';

export default class Hook {
    world: any;
    player: Player;
    sprite: Phaser.Sprite;
    chainSprites: Phaser.Sprite[] = [];
    lastChainDistance: number = Number.MAX_SAFE_INTEGER;

    constructor(world: any, player: Player) {
        this.world = world;
        this.player = player;

        this.sprite = this.world.add.sprite(0, 0,
                                            Atlases.SpritesheetsItemsSpritesheet.getName(),
                                            Atlases.SpritesheetsItemsSpritesheet.Frames.Spikes);
        this.sprite.visible = false;
        this.sprite.anchor.setTo(0.5, 1);
        this.sprite.scale.setTo(0.2, 0.5);
    }

    public destroy(): void {
        this.sprite.destroy();
        for (let chainSprite of this.chainSprites) {
            chainSprite.destroy();
        }
    }

    public changeVisiblity(visible: boolean): void {
        this.sprite.visible = visible;
        for (let chainSprite of this.chainSprites) {
            chainSprite.visible = visible;
        }
    }

    private createChain(from: Phaser.Sprite, to: Phaser.Sprite,
                        changePos: boolean = true, unshift: boolean = false): Phaser.Sprite {
        let angle = Math.atan2(from.y - to.y,
                               from.x - to.x);

        let posX;
        let posY;
        if (changePos) {
            posX = from.x - Math.cos(angle) * from.width;
            posY = from.y - Math.sin(angle) * from.width;
        } else {
            posX = from.x;
            posY = from.y;
        }

        angle = angle * (180 / Math.PI) + 90;

        let chainSprite = this.world.add.sprite(0, 0,
                                                Atlases.SpritesheetsItemsSpritesheet.getName(),
                                                Atlases.SpritesheetsItemsSpritesheet.Frames.Chain);
        chainSprite.anchor.setTo(0.5);
        chainSprite.scale.setTo(0.3);
        chainSprite.x = posX;
        chainSprite.y = posY;
        chainSprite.angle = angle;

        if (!unshift) {
            this.chainSprites.push(chainSprite);
        } else {
            this.chainSprites.unshift(chainSprite);
        }

        return chainSprite;
    }

    private needToExtendChain(obj: Phaser.Sprite, chain: Phaser.Sprite): boolean {
        let xDist = Math.pow(obj.x - chain.x, 2);
        let yDist = Math.pow(obj.y - chain.y, 2);
        let distance = Math.sqrt(xDist + yDist);
        return distance > chain.width;
    }

    public update(hookUpdate: any): void {
        if (this.player.id === this.world.socket.id) {
            this.world.skills.hook.cooldown = hookUpdate.cooldown;
        }

        if (hookUpdate.active) {
            this.sprite.visible = true;

            this.sprite.x = hookUpdate.x;
            this.sprite.y = hookUpdate.y;
            this.sprite.angle = hookUpdate.angle * (180 / Math.PI) + 90;

            let lastChain = this.chainSprites[this.chainSprites.length - 1];

            if (!hookUpdate.returning) {
                let target = lastChain || this.player.sprite;
                while (this.needToExtendChain(this.sprite, target)) {
                    let changePos;
                    if (target === this.player.sprite) {
                        changePos = false;
                    } else {
                        changePos = true;
                    }
                    this.createChain(target, this.sprite, changePos);
                    target = this.chainSprites[this.chainSprites.length - 1];
                }
            } else if (lastChain) {
                let xDist = Math.pow(this.sprite.x - lastChain.x, 2);
                let yDist = Math.pow(this.sprite.y - lastChain.y, 2);
                let distance = Math.sqrt(xDist + yDist);

                if (distance > this.lastChainDistance || distance < lastChain.width / 4 * 3) {
                    this.chainSprites.pop().destroy();
                    this.lastChainDistance = Number.MAX_SAFE_INTEGER;
                } else {
                    this.lastChainDistance = distance;
                }
            }

            // Chain following player
            while (this.chainSprites.length > 0 && this.needToExtendChain(this.player.sprite, this.chainSprites[0])) {
                this.createChain(this.chainSprites[0], this.player.sprite, true, true);
            }
        } else if (this.sprite.visible) {
            this.sprite.visible = false;
            for (let chain of this.chainSprites) {
                chain.destroy();
            }
            this.chainSprites = [];
            this.lastChainDistance = Number.MAX_SAFE_INTEGER;
        }
    }
}
