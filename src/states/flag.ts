
export default class Flag {
    team: number;
    sprite: Phaser.Sprite;

    constructor(team: any, sprite: Phaser.Sprite) {
        this.team = team;
        this.sprite = sprite;
    }
}