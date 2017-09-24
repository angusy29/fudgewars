import Hook from './hook';

export default class Player {
    id: any;
    name: Phaser.Text;
    sprite: Phaser.Sprite;
    isFaceRight: boolean;   // is the player facing right
    hook: Hook;
    world: Phaser.State;

    constructor(world: any, id: any, name: Phaser.Text, sprite: Phaser.Sprite) {
        this.world = world;
        this.id = id;
        this.name = name;
        this.sprite = sprite;
        this.hook = new Hook(world, this);
        this.isFaceRight = true;
    }

    public destroy(): void {
        this.sprite.destroy();
        this.name.destroy();
        this.hook.destroy();
    }

    public setIsFaceRight(b: boolean): void {
        this.isFaceRight = b;
    }

    public getIsFaceRight(): boolean {
        return this.isFaceRight;
    }

    public updateHook(hookUpdate: any): void {
        this.hook.update(hookUpdate);
    }
}
