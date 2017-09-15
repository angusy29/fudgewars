
export default class Player {
    id: any;
    sprite: Phaser.Sprite;
    isFaceRight: boolean;   // is the player facing right

    constructor(id: any, sprite: Phaser.Sprite) {
        this.id = id;
        this.sprite = sprite;
        this.isFaceRight = true;
    }

    public setIsFaceRight(b: boolean): void {
        this.isFaceRight = b;
    }

    public getIsFaceRight(): boolean {
        return this.isFaceRight;
    }
}