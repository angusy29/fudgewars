import Hook from './hook';
import Sword from './sword';

export default class Player {
    id: any;
    world: Phaser.State;
    name: Phaser.Text;      // child of sprite
    health: number;         // health out of 100
    healthBar: Phaser.Group;   // health bar of the sprite
    sprite: Phaser.Sprite;
    isFaceRight: boolean;   // is the player facing right
    alive: boolean;
    weaponGroup: Phaser.Group; // weapon sprites of the player
    hook: Hook;
    sword: Sword;

    // width of healthbar is 40
    static readonly HEALTHBAR_WIDTH = 40;

    // offsets from the player pos where labels and sprites should be placed
    static readonly PLAYER_NAME_Y_OFFSET = 40;
    static readonly HEALTH_BAR_X_OFFSET = 20;
    static readonly HEALTH_BAR_Y_OFFSET = 28;

    // health bar colors
    static readonly HEALTH_GREEN_COLOUR = '#32CD32';
    static readonly HEALTH_RED_COLOUR = '#FF0000';

    constructor(world: any, id: any, name: Phaser.Text, healthBar: Phaser.Group, sprite: Phaser.Sprite) {
        this.world = world;
        this.id = id;
        this.name = name;
        this.healthBar = healthBar;
        this.sprite = sprite;
        this.isFaceRight = true;
        this.health = 100;
        this.alive = true;

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
        this.healthBar.destroy();
        this.hook.destroy();
        this.sword.destroy();
    }

    public changeVisiblity(visible: boolean): void {
        this.sprite.visible = visible;
        this.name.visible = visible;
        this.healthBar.visible = visible;

        this.sword.changeVisiblity(visible);

        // Note: Hook continues even when the player dies
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
