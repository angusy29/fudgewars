import Hook from './hook';
import Sword from './sword';

export default class Player {
    id: any;
    world: Phaser.State;
    name: Phaser.Text;         // child of sprite
    private health: number;    // Note: Use the getter and setter to keep alive status accurate
    healthBar: Phaser.Group;   // health bar of the sprite
    sprite: Phaser.Sprite;
    isFaceRight: boolean;      // is the player facing right
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
        this.health = 0;
        this.alive = false;

        this.hook = new Hook(world, this);
        this.sword = new Sword(world, this);

        this.weaponGroup = this.world.game.add.group();
        this.weaponGroup.addAt(this.sword.sprite, 0);
        this.weaponGroup.addAt(this.hook.sprite, 0);
    }

    public update(update: any): void {
        this.setHealth(update.health);

        // update sprite position
        this.sprite.x = update.x;
        this.sprite.y = update.y;
        this.name.x = update.x;
        this.name.y = update.y - Player.PLAYER_NAME_Y_OFFSET;

        // group items are relative to the group object, so we
        // loop through and set each one instead
        this.healthBar.forEach(element => {
            element.x = update.x - Player.HEALTH_BAR_X_OFFSET;
            element.y = update.y - Player.HEALTH_BAR_Y_OFFSET;
        }, this);

        this.updateSpriteDirection(update);

        // update player animation, if they are walking
        if (update.vx || update.vy) {
            this.sprite.animations.play('walk', 20, true);
        } else {
            this.sprite.animations.stop(null, true);
        }

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

    /*
     * Flips the player sprite depending on direction of movement
     * player: A player object sent from the server
     */
    private updateSpriteDirection(update: any): void {
        // player is moving left
        if (update.left !== 0) {
            // player is facing right
            if (this.getIsFaceRight()) {
                // so we need to flip him
                this.setIsFaceRight(false);
                // so when we flip the sprite, the name gets flipped back to original orientation
                this.sprite.scale.x *= -1;
            }
        } else if (update.right !== 0) {    // player is moving right
            // player is facing left, so we need to flip him
            if (!this.getIsFaceRight()) {
                this.setIsFaceRight(true);
                this.sprite.scale.x *= -1;
            }
        }
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
        if (this.health === health) return;

        this.health = health;
        let healthFg: Phaser.Sprite = <Phaser.Sprite> this.healthBar.getChildAt(1);
        healthFg.width = Player.HEALTHBAR_WIDTH * (this.health / 100);

        if (this.alive && this.health <= 0) {
            // Update status to dead the first time we receive it
            this.alive = false;
            this.changeVisiblity(false);
        } else if (!this.alive && this.health > 0) {
            // Update status to alive the first time we receive it
            this.alive = true;
            this.changeVisiblity(true);
        }
    }

    public setIsFaceRight(b: boolean): void {
        this.isFaceRight = b;
    }

    public getIsFaceRight(): boolean {
        return this.isFaceRight;
    }
}
