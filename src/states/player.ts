import * as Assets from '../assets';
import Game from './game';
import Hook from './hook';
import Sword from './sword';
import { Images } from '../assets';
import Item from './item';

export default class Player {
    id: any;
    team: number;
    world: Game;
    name: string;
    nameText: Phaser.Text;         // child of sprite
    private health: number;    // Note: Use the getter and setter to keep alive status accurate
    healthBar: Phaser.Group;   // health bar of the sprite
    sprite: Phaser.Sprite;
    isFaceRight: boolean;      // is the player facing right
    alive: boolean;
    weaponGroup: Phaser.Group; // weapon sprites of the player
    hook: Hook;
    sword: Sword;
    trailEmitter: any;
    bloodEmitter: any;
    kills: number;
    deaths: number;
    wasted: Phaser.Image;
    spriteTween: Phaser.Tween;

    accessory: Phaser.Sprite;

    // width of healthbar is 40
    static readonly HEALTHBAR_WIDTH = 40;

    // offsets from the player pos where labels and sprites should be placed
    static readonly PLAYER_NAME_Y_OFFSET = 40;
    static readonly PLAYER_NAME_Y_OFFSET_ACCESSORY = 47;
    static readonly HEALTH_BAR_X_OFFSET = 20;
    static readonly HEALTH_BAR_Y_OFFSET = 28;
    static readonly HEALTH_BAR_Y_OFFSET_ACCESSORY = 35;

    static readonly ACCESSORY_X_OFFSET = 18;
    static readonly ACCESSORY_Y_OFFSET = 50;

    // health bar colors
    static readonly HEALTH_GREEN_COLOUR = '#32CD32';
    static readonly HEALTH_RED_COLOUR = '#FF0000';

    constructor(world: Game, x: number, y: number, id: any, name: string, team: number, accessoryTile: number) {
        this.world = world;
        this.id = id;
        this.team = team;
        this.isFaceRight = true;
        this.health = 0;
        this.alive = false;
        this.sprite = this.createSprite(x, y, name);
        this.healthBar = this.createHealthBar();
        this.kills = 0;
        this.deaths = 0;
        this.name = name;
        this.wasted = this.world.add.image(this.world.camera.width / 2, this.world.camera.height / 2, 'wasted');
        this.wasted.anchor.setTo(0.5, 0.5);
        this.wasted.fixedToCamera = true;
        this.wasted.visible = false;

        this.hook = new Hook(world, this);
        this.sword = new Sword(world, this);

        this.weaponGroup = this.world.game.add.group();
        this.weaponGroup.addAt(this.sword.sprite, 0);
        this.weaponGroup.addAt(this.hook.sprite, 0);

        this.trailEmitter = this.world.game.add.emitter(0, 0, 100);
        this.trailEmitter.makeParticles(Images.ImagesParticleWalkTrail.getName());
        this.trailEmitter.minParticleScale = 0.02;
        this.trailEmitter.maxParticleScale = 0.15;
        this.trailEmitter.setYSpeed(-70, -50);
        this.trailEmitter.setXSpeed(-5, 5);
        this.trailEmitter.gravity = 200;
        this.trailEmitter.on = false;
        this.trailEmitter.start(false, 1000, 100, 1);

        this.bloodEmitter = this.world.game.add.emitter(0, 0, 200);
        this.bloodEmitter.makeParticles(Images.ImagesParticleBlood.getName());
        this.bloodEmitter.minParticleScale = 0.05;
        this.bloodEmitter.maxParticleScale = 0.2;
        this.bloodEmitter.setYSpeed(-100, 0);
        this.bloodEmitter.setXSpeed(-60, 60);
        this.bloodEmitter.gravity = 200;

        if (accessoryTile !== 0) {
            this.accessory = this.world.game.add.sprite(x - Player.ACCESSORY_X_OFFSET, y - Player.ACCESSORY_Y_OFFSET,
                                Assets.Atlases.SpritesheetsItemsSpritesheet.getName(), Item.AccessorySprites[accessoryTile]);
            this.accessory.scale.setTo(0.5, 0.5);
        }
    }

    public update(update: any): void {
        this.setHealth(update.health);
        this.kills = update.kills;
        this.deaths = update.deaths;

        // walk particles
        if (update.x !== this.sprite.x || update.y !== this.sprite.y) {
            this.trailEmitter.on = true;
            this.trailEmitter.x = update.x;
            this.trailEmitter.y = update.y + this.sprite.height / 2;
            this.trailEmitter.forEach((particle) => {
                if (!particle.exists) {
                    if (Math.random() > 0.2) {
                        particle.alpha = 1;
                    } else {
                        particle.kill();
                    }
                }
                this.world.game.add.tween(particle).to({ alpha: 0 }, 1000, Phaser.Easing.Cubic.Out, true);
            }, this);
        } else {
            this.trailEmitter.on = false;
        }

        // update sprite position
        this.sprite.x = update.x;
        this.sprite.y = update.y;
        this.nameText.x = update.x;
        if (this.accessory) {
            this.nameText.y = update.y - Player.PLAYER_NAME_Y_OFFSET_ACCESSORY;
        } else {
            this.nameText.y = update.y - Player.PLAYER_NAME_Y_OFFSET;
        }

        if (this.accessory) {
            this.accessory.x = update.x - Player.ACCESSORY_X_OFFSET;
            this.accessory.y = update.y - Player.ACCESSORY_Y_OFFSET;
        }

        // group items are relative to the group object, so we
        // loop through and set each one instead
        this.healthBar.forEach(element => {
            element.x = update.x - Player.HEALTH_BAR_X_OFFSET;
            if (this.accessory) {
                element.y = update.y - Player.HEALTH_BAR_Y_OFFSET_ACCESSORY;
            } else {
                element.y = update.y - Player.HEALTH_BAR_Y_OFFSET;
            }
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

    private createSprite(x: number, y: number, name: string): Phaser.Sprite {
        let frame;
        if (this.team === Game.BLUE) frame = 'p2_walk';
        if (this.team === Game.RED) frame = 'p3_walk';

        // set up sprite
        let sprite = this.world.add.sprite(x, y, frame);
        sprite.anchor.setTo(0.5, 0.5);
        sprite.scale.setTo(0.5);
        sprite.animations.add('walk');
        this.world.physics.enable(sprite, Phaser.Physics.ARCADE);

        // set up label of the player
        this.nameText = this.world.game.add.text(x, y - Player.PLAYER_NAME_Y_OFFSET, name, {
            font: '14px ' + 'Arial'
        });
        this.nameText.anchor.setTo(0.5, 0.5);

        this.spriteTween = this.world.add.tween(sprite).to({ angle: -90 }, 2000, 'Linear', true, 0);

        return sprite;
    }

    /*
     * Creates the canvas for player health bar
     * player: Player to create health bar for
     *
     * return: A group containing the health bar foreground (green part)
     * and the health bar background (red part), they are indexes 0 and 1
     * respectively
     */
    private createHealthBar(): Phaser.Group {
        // create health bar canvas
        let healthBMP = this.world.add.bitmapData(Player.HEALTHBAR_WIDTH, 5);
        healthBMP.ctx.beginPath();
        healthBMP.ctx.rect(0, 0, Player.HEALTHBAR_WIDTH, 5);
        healthBMP.ctx.fillStyle = Player.HEALTH_GREEN_COLOUR;
        healthBMP.ctx.fillRect(0, 0, Player.HEALTHBAR_WIDTH, 5);

        let healthBgBMP = this.world.add.bitmapData(Player.HEALTHBAR_WIDTH, 5);
        healthBgBMP.ctx.beginPath();
        healthBgBMP.ctx.rect(0, 0, Player.HEALTHBAR_WIDTH, 5);
        healthBgBMP.ctx.fillStyle = Player.HEALTH_RED_COLOUR;
        healthBgBMP.ctx.fillRect(0, 0, Player.HEALTHBAR_WIDTH, 5);

        // health bar green part
        let healthBarFg = this.world.add.sprite(this.sprite.x - Player.HEALTH_BAR_X_OFFSET, this.sprite.y - Player.HEALTH_BAR_Y_OFFSET, healthBMP);

        // health bar red part
        let healthBarBg = this.world.add.sprite(this.sprite.x - Player.HEALTH_BAR_X_OFFSET, this.sprite.y - Player.HEALTH_BAR_Y_OFFSET, healthBgBMP);

        let healthBar = new Phaser.Group(this.world.game);
        healthBar.addAt(healthBarBg, 0);
        healthBar.addAt(healthBarFg, 1);

        return healthBar;
    }

    public destroy(): void {
        this.sprite.destroy();
        this.nameText.destroy();
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

    public changeVisiblity(visible: boolean): any {
        this.sprite.visible = visible;
        this.nameText.visible = visible;
        this.healthBar.visible = visible;

        this.sword.changeVisiblity(visible);

        // Note: Hook continues even when the player dies
    }

    public getHealth(): number {
        return this.health;
    }

    public setHealth(health: number): void {
        if (this.health === health) {
            return;
        }

        // Damage particles
        if (health < this.health) {
            this.bloodEmitter.x = this.sprite.x;
            this.bloodEmitter.y = this.sprite.y;
            this.bloodEmitter.start(true, 1000, 1, 25);
            this.bloodEmitter.forEach((particle) => {
                if (!particle.exists) {
                    particle.alpha = 1;
                }
                this.world.game.add.tween(particle).to({ alpha: 0 }, 1000, Phaser.Easing.Cubic.Out, true);
            }, this);
        }

        this.health = health;
        let healthFg: Phaser.Sprite = <Phaser.Sprite> this.healthBar.getChildAt(1);
        healthFg.width = Player.HEALTHBAR_WIDTH * (this.health / 100);

        if (this.alive && this.health <= 0) {
            // Update status to dead the first time we receive it
            this.alive = false;
            this.deathAnimation();
        } else if (!this.alive && this.health > 0) {
            // Update status to alive the first time we receive it
            this.alive = true;
            this.respawnAnimation();
            this.world.tweens.removeAll();
        }
    }

    public setIsFaceRight(b: boolean): void {
        this.isFaceRight = b;
    }

    public getIsFaceRight(): boolean {
        return this.isFaceRight;
    }

    public deathAnimation(): any {
        this.spriteTween = this.world.add.tween(this.sprite).to({ angle: -90 }, 2000, 'Linear', true, 0);
        this.spriteTween.onComplete.add(this.death, this);
        this.healthBar.visible = false;
    }

    public death(): any {
        if (this.world.client_id === this.id) {
            this.wasted.visible = true;
        }
        this.changeVisiblity(false);
    }

    public respawnAnimation(): void {
        this.changeVisiblity(true);
        this.wasted.visible = false;
        this.sprite.rotation = 0;
    }
}
