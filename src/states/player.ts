import Hook from './hook';

export default class Player {
    id: any;
    name: Phaser.Text;
    sprite: Phaser.Sprite;
    isFaceRight: boolean;   // is the player facing right
    hook: Hook;

    constructor(game: Phaser.State, id: any, name: Phaser.Text, sprite: Phaser.Sprite) {
        this.id = id;
        this.name = name;
        this.sprite = sprite;
        this.hook = new Hook(game, this);
        this.isFaceRight = true;
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
