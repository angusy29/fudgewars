
export default class Player {
    id: any;
    name: Phaser.Text;      // child of sprite
    health: number;         // health out of 100
    healthBar: Phaser.Group;   // health bar of the sprite
    sprite: Phaser.Sprite;
    isFaceRight: boolean;   // is the player facing right

    // width of healthbar is 40
    static readonly HEALTHBAR_WIDTH = 40;

    // offsets from the player pos where labels and sprites should be placed
    static readonly PLAYER_NAME_Y_OFFSET = 40;
    static readonly HEALTH_BAR_X_OFFSET = 20;
    static readonly HEALTH_BAR_Y_OFFSET = 28;

    // health bar colors
    static readonly HEALTH_GREEN_COLOUR = '#32CD32';
    static readonly HEALTH_RED_COLOUR = '#FF0000';

    constructor(id: any, name: Phaser.Text, healthBar: Phaser.Group, sprite: Phaser.Sprite) {
        this.id = id;
        this.name = name;
        this.healthBar = healthBar;
        this.sprite = sprite;
        this.isFaceRight = true;

        this.health = 100;
    }

    public getHealth(): number {
        return this.health;
    }

    public setHealth(health: number): void {
        this.health = health;
    }

    public setIsFaceRight(b: boolean): void {
        this.isFaceRight = b;
    }

    public getIsFaceRight(): boolean {
        return this.isFaceRight;
    }
}