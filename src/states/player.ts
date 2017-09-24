import Hook from './hook';
import Sword from './sword';

export default class Player {
    id: any;
    name: Phaser.Text;
    weaponGroup: Phaser.Group;
    sprite: Phaser.Sprite;
    isFaceRight: boolean;   // is the player facing right
    world: Phaser.State;
    hook: Hook;
    sword: Sword;

    constructor(world: any, id: any, name: Phaser.Text, sprite: Phaser.Sprite) {
        this.world = world;
        this.id = id;
        this.name = name;
        this.sprite = sprite;
        this.isFaceRight = true;
        this.hook = new Hook(world, this);
        this.sword = new Sword(world, this);
        this.weaponGroup = this.world.game.add.group();

        this.weaponGroup.addAt(this.sword.sprite, 0);
        this.weaponGroup.addAt(this.hook.sprite, 0);
    }

    public update(update: any): void {
        this.hook.update(update.hook);
        this.sword.update(update.sword);
    }

    public destroy(): void {
        this.sprite.destroy();
        this.name.destroy();
        this.hook.destroy();
        this.sword.destroy();
    }

    public setIsFaceRight(b: boolean): void {
        this.isFaceRight = b;
    }

    public getIsFaceRight(): boolean {
        return this.isFaceRight;
    }
}
