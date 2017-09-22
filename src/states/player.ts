
export default class Player {
    id: any;
    name: Phaser.Text;
    sprite: Phaser.Sprite;
    hookSprite: Phaser.Sprite;
    isFaceRight: boolean;   // is the player facing right

    constructor(id: any, name: Phaser.Text, sprite: Phaser.Sprite) {
        this.id = id;
        this.name = name;
        this.sprite = sprite;
        this.hookSprite = null;
        this.isFaceRight = true;
    }

    public setIsFaceRight(b: boolean): void {
        this.isFaceRight = b;
    }

    public getIsFaceRight(): boolean {
        return this.isFaceRight;
    }
}