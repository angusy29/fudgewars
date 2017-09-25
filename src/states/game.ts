import * as Assets from '../assets';
import * as io from 'socket.io-client';
import Player from './player';
import Flag from './flag';

// TODO have a single file for both server/client constants?
const COOLDOWNS = {
    hook: 5,
    sword: 0.5,
};

/*
 * The actual game client
 */
export default class Game extends Phaser.State {
    private map: Phaser.Tilemap;
    public socket: any;
    private players: any = {};
    private flags: Flag[] = [];
    private flagGroup: Phaser.Group = null;
    private uiGroup: Phaser.Group = null;
    private playerGroup: Phaser.Group = null;
    private weaponGroup: Phaser.Group = null;
    private isDown: any = {};
    private nextFrame = 0;
    private mapLayer: Phaser.TilemapLayer;
    private terrainLayer: Phaser.TilemapLayer;

    private skillList: string[] = ['hook', 'sword'];
    public skills: any = {
        hook: {
            name: 'hook',
            img: 'attack_hook',
            button: 'LMB',
            cooldown: 0,
            ui: {},
        },
        sword: {
            name: 'sword',
            img: 'attack_sword',
            button: 'RMB',
            cooldown: 0,
            ui: {},
        },
    };

    static readonly PLAYER_NAME_Y_OFFSET = 24;

    // used to render own client's name green
    private client_id: string;

    static readonly BLUE = 0;
    static readonly RED = 1;

    public init(socket: any): void {
        // this.game.stage.disableVisibilityChange = true;
        this.flagGroup = this.game.add.group();
        this.uiGroup = this.game.add.group();
        this.playerGroup = this.game.add.group();
        this.weaponGroup = this.game.add.group();
        this.client_id = socket.id;

        this.socket = socket;

        this.socket.on('loaded', (data: any) => {
            this.loadUI();
            this.loadWorld(data.world);
            this.loadTerrain(data.terrain);
            this.loadFlags(data.flags);

            // Sprite ordering
            this.game.world.sendToBack(this.flagGroup);
            this.game.world.sendToBack(this.terrainLayer);
            this.game.world.sendToBack(this.mapLayer);
        });

        this.socket.on('update', (data: any) => {
            for (let playerUpdate of data.players) {
                if (!this.players[playerUpdate.id]) {
                    this.addNewPlayer(playerUpdate);
                }

                let player = this.players[playerUpdate.id];

                player.update(playerUpdate);

                // update sprite position
                player.sprite.x = playerUpdate.x;
                player.sprite.y = playerUpdate.y;
                player.name.x = playerUpdate.x;
                player.name.y = playerUpdate.y - Player.PLAYER_NAME_Y_OFFSET;

                // group items are relative to the group object, so we
                // loop through and set each one instead
                player.healthBar.forEach(element => {
                    element.x = playerUpdate.x - Player.HEALTH_BAR_X_OFFSET;
                    element.y = playerUpdate.y - Player.HEALTH_BAR_Y_OFFSET;
                });

                /* Sample code on how to decrease health */
                if (player.getHealth() > 0) {
                    let healthFg = player.healthBar.getChildAt(1);
                    player.health -= 1;
                    healthFg.width = Player.HEALTHBAR_WIDTH * (player.health / 100);
                } else if (player.alive) {
                    player.alive = false;
                    this.changePlayerVisibility(playerUpdate, false);
                    this.socket.emit('dead');
                }
                this.updateSpriteDirection(playerUpdate);

                // update player animation, if they are walking
                if (playerUpdate.vx || playerUpdate.vy) {
                    player.sprite.animations.play('walk', 20, true);
                } else {
                    player.sprite.animations.stop(null, true);
                }

                this.game.world.bringToTop(this.playerGroup);
                this.game.world.bringToTop(this.weaponGroup);
                this.game.world.bringToTop(this.uiGroup);

                this.drawUI();
            }

            // update the position of the flags
            for (let f of data.flags) {
                if (typeof this.flags[f.colorIdx] !== 'undefined') {
                    this.flags[f.colorIdx].sprite.x = f.x;
                    this.flags[f.colorIdx].sprite.y = f.y;
                    if (f.isCaptured)
                        this.flags[f.colorIdx].setFlagDown();
                    else
                        this.flags[f.colorIdx].setFlagUp();
                }
            }
        });

        this.socket.on('player_left', (id: number) => {
            console.log('player left');
            this.playerGroup.remove(this.players[id].sprite);
            this.weaponGroup.remove(this.players[id].weaponGroup);
            this.players[id].destroy();
            delete this.players[id];
        });

        this.socket.on('capture_flag', (flagId) => {
            console.log('capture_flag');
            this.flags[flagId].setFlagDown();
        });

        this.socket.on('respawn', (player: any) => {
            console.log('respawn');
            if (this.players[player.id]) {
                this.players[player.id].alive = true;
                this.changePlayerVisibility(player, true);
                this.players[player.id].setHealth(100);
            }
        });
    }

    /*
     * Flips the player sprite depending on direction of movement
     * player: A player object sent from the server
     */
    private updateSpriteDirection(player: any) {
        // player is moving left
        if (player.left !== 0) {
            // player is facing right
            if (this.players[player.id].getIsFaceRight()) {
                // so we need to flip him
                this.players[player.id].setIsFaceRight(false);
                // so when we flip the sprite, the name gets flipped back to original orientation
                this.players[player.id].sprite.scale.x *= -1;
            }
        } else if (player.right !== 0) {    // player is moving right
            // player is facing left, so we need to flip him
            if (!this.players[player.id].getIsFaceRight()) {
                this.players[player.id].setIsFaceRight(true);
                this.players[player.id].sprite.scale.x *= -1;
            }
        }
    }

    private getCoordinates(layer: Phaser.TilemapLayer, pointer: Phaser.Pointer): void {
        console.log(layer, pointer);
    }

    private changePlayerVisibility(player: any, visible: boolean): void {
        this.players[player.id].sprite.visible = visible;
        this.players[player.id].name.visible = visible;
        this.players[player.id].healthBar.visible = visible;
    }

    /*
     * Adds a new player to the game
     * Creates a sprite for the player and populates list of players
     * on the client
     *
     * player: A player object from the server
     */
    private addNewPlayer(player: any): void {
        let frame;
        if (player.team === Game.BLUE) frame = 'p2_walk';
        if (player.team === Game.RED) frame = 'p3_walk';

        // set up sprite
        let sprite = this.game.add.sprite(player.x, player.y, frame);
        sprite.anchor.setTo(0.5, 0.5);
        sprite.scale.setTo(0.5);
        sprite.animations.add('walk');
        this.game.physics.enable(sprite, Phaser.Physics.ARCADE);

        // set up label of the player
        let name = this.game.add.text(player.x, player.y - Player.PLAYER_NAME_Y_OFFSET, player.name, {
            font: '14px ' + Assets.GoogleWebFonts.Roboto
        });
        name.anchor.setTo(0.5, 0.5);

        // if this is the client's player, set the colour to be limegreen
        if (player.id === this.client_id) {
            name.addColor('#32CD32', 0);
        }

        let healthBar = this.createPlayerHealthBar(player);
        this.players[player.id] = new Player(this, player.id, name, healthBar, sprite);

        this.playerGroup.add(this.players[player.id].sprite);
        this.weaponGroup.add(this.players[player.id].weaponGroup);
    }

    /*
     * Creates the canvas for player health bar
     * player: Player to create health bar for
     *
     * return: A group containing the health bar foreground (green part)
     * and the health bar background (red part), they are indexes 0 and 1
     * respectively
     */
    private createPlayerHealthBar(player: any): Phaser.Group {
        // create health bar canvas
        let healthBMP = this.game.add.bitmapData(Player.HEALTHBAR_WIDTH, 5);
        healthBMP.ctx.beginPath();
        healthBMP.ctx.rect(0, 0, Player.HEALTHBAR_WIDTH, 5);
        healthBMP.ctx.fillStyle = Player.HEALTH_GREEN_COLOUR;
        healthBMP.ctx.fillRect(0, 0, Player.HEALTHBAR_WIDTH, 5);

        let healthBgBMP = this.game.add.bitmapData(Player.HEALTHBAR_WIDTH, 5);
        healthBgBMP.ctx.beginPath();
        healthBgBMP.ctx.rect(0, 0, Player.HEALTHBAR_WIDTH, 5);
        healthBgBMP.ctx.fillStyle = Player.HEALTH_RED_COLOUR;
        healthBgBMP.ctx.fillRect(0, 0, Player.HEALTHBAR_WIDTH, 5);

        // health bar green part
        let healthBarFg = this.game.add.sprite(player.x - Player.HEALTH_BAR_X_OFFSET, player.y - Player.HEALTH_BAR_Y_OFFSET, healthBMP);

        // health bar red part
        let healthBarBg = this.game.add.sprite(player.x - Player.HEALTH_BAR_X_OFFSET, player.y - Player.HEALTH_BAR_Y_OFFSET, healthBgBMP);

        let healthBar = new Phaser.Group(this.game);
        healthBar.addAt(healthBarBg, 0);
        healthBar.addAt(healthBarFg, 1);

        return healthBar;
    }

    /*
     * Callback for when key is pressed down
     */
    private onDown(e: KeyboardEvent): void {
        if (this.isDown[e.keyCode]) {
            return;
        }
        this.isDown[e.keyCode] = true;
        switch (e.keyCode) {
            case 87:    // w
                this.socket.emit('keydown', 'up');
                break;
            case 65:    // a
                this.socket.emit('keydown', 'left');
                break;
            case 83:    // s
                this.socket.emit('keydown', 'down');
                break;
            case 68:    // d
                this.socket.emit('keydown', 'right');
                break;
            default:
                break;
        }
    }

    /*
     * Callback for when key is bounced back up
     */
    private onUp(e: KeyboardEvent): void {
        this.isDown[e.keyCode] = false;
        switch (e.keyCode) {
            case 87:    // w
                this.socket.emit('keyup', 'up');
                break;
            case 65:    // a
                this.socket.emit('keyup', 'left');
                break;
            case 83:    // s
                this.socket.emit('keyup', 'down');
                break;
            case 68:    // d
                this.socket.emit('keyup', 'right');
                break;
            default:
                break;
        }
    }

    private loadTerrain(terrain: number[][]): void {
        // Format terrain data
        let data: string = this.parseLayer(terrain);

        this.game.cache.addTilemap('terrain', null, data, Phaser.Tilemap.CSV);
        let terrainMap: Phaser.Tilemap = this.game.add.tilemap('terrain', 64, 64);
        terrainMap.addTilesetImage('tilesheet', 'world.[64,64]');
        this.terrainLayer = terrainMap.createLayer(0);
    }

    private loadFlags(flags: any): void {
        for (let f of flags) {
            let newFlag = new Flag(this.game, f.x, f.y, f.colorIdx, f.captured);
            this.flags[f.colorIdx] = newFlag;
            this.flagGroup.add(newFlag.sprite);
        }
    }

    // public create(): void {
    //     // this is the tilesheet
    //     this.map = this.game.add.tilemap('world');
    //     this.map.addTilesetImage('tilesheet', 'world.[64,64]');

    //     this.game.cache.addTilemap('terrain', null, data, Phaser.Tilemap.CSV);
    //     let terrainMap: Phaser.Tilemap = this.game.add.tilemap('terrain', 64, 64);
    //     terrainMap.addTilesetImage('tilesheet', 'world.[64,64]');

    //     this.terrainLayer = terrainMap.createLayer(0);
    // }

    private loadWorld(world: number[][]): void {
        let data: string = this.parseLayer(world);

        this.game.load.tilemap('world', null, data, Phaser.Tilemap.CSV);
        this.map = this.game.add.tilemap('world', 64, 64);
        this.map.addTilesetImage('tilesheet', 'world.[64,64]');

        let layer: Phaser.TilemapLayer = this.map.createLayer(0);
        this.mapLayer = layer;

        layer.inputEnabled = true;

        // layer.events.onInputUp.add(this.getCoordinates);
        layer.events.onInputDown.add(this.onWorldClick.bind(this));
    }

    private drawUI(): void {
        for (let skillIndex in this.skillList) {
            let skillName: string = this.skillList[skillIndex];
            let skill = this.skills[skillName];
            if (Object.keys(skill.ui).length === 0) continue;

            let ui = skill.ui;
            if (skill.cooldown > 0) {
                ui.overlayImg.visible = true;
                ui.overlayImg.height = (skill.cooldown / COOLDOWNS[skill.name]) * ui.skillImg.height;
                ui.text.text = skill.cooldown.toFixed(1);
            } else {
                ui.overlayImg.visible = false;
                ui.text.text = '';
            }
        }
    }

    private loadUI(): void {
        let width: number = 45;
        let height: number = 45;

        for (let skillIndex in this.skillList) {
            let skillName: string = this.skillList[skillIndex];
            let skill = this.skills[skillName];

            let centerX: number = parseInt(skillIndex) * width;
            let centerY: number = 0;

            let skillImg: Phaser.Image = this.game.add.image(centerX, centerY, skill.img);
            skillImg.width = width;
            skillImg.height = height;
            skillImg.anchor.setTo(0.5);
            skillImg.fixedToCamera = true;

            let overlayImg: Phaser.Image = this.game.add.image(centerX, centerY + height / 2, 'skill_cooldown_overlay');
            overlayImg.width = width;
            overlayImg.height = height;
            overlayImg.alpha = 0.5;
            overlayImg.anchor.setTo(0.5, 1);
            overlayImg.fixedToCamera = true;
            overlayImg.visible = false;

            let text: Phaser.Text = this.game.add.text(centerX, centerY, '', {
                font: '16px ' + Assets.GoogleWebFonts.Roboto,
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 3,
            });
            text.anchor.setTo(0.5);

            let buttonText: Phaser.Text = this.game.add.text(centerX + width / 2, centerY + height / 2 + 7, skill.button, {
                font: '8px ' + Assets.GoogleWebFonts.Roboto,
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 3,
            });
            buttonText.anchor.setTo(1);

            skill.ui = {
                skillImg: skillImg,
                overlayImg: overlayImg,
                text: text,
                buttonText: buttonText,
            };

            this.uiGroup.add(skillImg);
            this.uiGroup.add(overlayImg);
            this.uiGroup.add(text);
            this.uiGroup.add(buttonText);
        }

        this.uiGroup.x = this.game.width / 2 - this.uiGroup.width / 2 + width / 2;
        this.uiGroup.y = this.game.height - (height / 2);
    }

    private onWorldClick(layer: Phaser.TilemapLayer, pointer: Phaser.Pointer): void {
        if (pointer.leftButton.isDown && this.skills.hook.cooldown === 0) {
            let id = this.socket.id;
            let me: Player = this.players[id];
            let angle = Math.atan2(pointer.y - me.sprite.y, pointer.x - me.sprite.x);
            this.socket.emit('attack_hook', angle);
        }
        if (pointer.rightButton.isDown && this.skills.sword.cooldown === 0) {
            let id = this.socket.id;
            let me: Player = this.players[id];
            let angle = Math.atan2(pointer.y - me.sprite.y, pointer.x - me.sprite.x);
            this.socket.emit('attack_sword', angle);
        }
    }

    private parseLayer(layer: number[][]): string {
        // Format data
        let tilemapMapping = {
            0: 16, // Air
            // 1: 186 // Wall
        };
        let data: string = '';
        let y: any;
        for (y in layer) {
            let row = layer[y];
            let x: any;
            for (x in row) {
                let col = row[x];
                if (col === 0) {
                    col = tilemapMapping[col];
                }
                data += col.toString();
                if (x < row.length - 1) {
                    data +=  ',';
                }
            }
            if (y < layer.length - 1) {
                data +=  '\n';
            }
        }
        return data;
    }

    public create(): void {
        // on down keypress, call onDown function
        // on up keypress, call the onUp function
        this.input.keyboard.addCallbacks(this, this.onDown, this.onUp);
        this.game.input.mouse.capture = true;
        this.game.canvas.oncontextmenu = (e) => { e.preventDefault(); };

        this.socket.emit('join_game');
    }

    public preload(): void {
        // load the map
        // this.game.load.tilemap('world', null, this.game.cache.getJSON('mymap'), Phaser.Tilemap.TILED_JSON);
        // this.game.physics.startSystem(Phaser.Physics.ARCADE);
    }
}
