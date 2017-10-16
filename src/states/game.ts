import * as Assets from '../assets';
import * as io from 'socket.io-client';
import Player from './player';
import Flag from './flag';
import ButtonUtil from './buttonutil';
import CustomButton from './custombutton';

import * as $ from 'jquery';

// TODO have a single file for both server/client constants?
const COOLDOWNS = {
    hook: 5,
    sword: 0.5,
};

/*
 * The actual game client
 */
export default class Game extends Phaser.State {
    private data: any;
    private pingText: Phaser.Text;
    private pingTime: number;
    private pingStartTime: number;

    private gameTimeText: Phaser.Text;
    private gameTime: number;

    private numCaptures: number[];

    private scoreOverlay: Phaser.Image;
    private blueScoreText: Phaser.Text;
    private redScoreText: Phaser.Text;

    private alertText: Phaser.Text;
    private alertQueue: string[];

    public socket: any;
    public me: Player;
    private gameOver: boolean;
    private map: Phaser.Tilemap;
    private players: any;
    private flags: Flag[];

    private flagGroup: Phaser.Group;
    private skillGroup: Phaser.Group;
    private playerGroup: Phaser.Group;
    private weaponGroup: Phaser.Group;
    private healthBarGroup: Phaser.Group;
    private particleGroup: Phaser.Group;
    private uiGroup: Phaser.Group;

    private isDown: any;
    private nextFrame;
    private mapLayer: Phaser.TilemapLayer;
    private terrainLayer: Phaser.TilemapLayer;

    private readonly skillList: string[] = ['hook', 'sword'];
    public skills: any;

    /* Escape menu */
    private isShowMenu: boolean;    // current state of showing or hiding menu
    private menuGroup: Phaser.Group;
    private buttonUtil: ButtonUtil;     // object used to create buttons
    private soundGroup: Phaser.Group;
    private quitGame: CustomButton;

    // used to render own client's name green
    public client_id: string;
    private room: string;

    /* Static variables */
    static readonly PLAYER_NAME_Y_OFFSET = 24;

    static readonly BLUE = 0;
    static readonly RED = 1;

    public create(): void {
        // on down keypress, call onDown function
        // on up keypress, call the onUp function
        this.input.keyboard.addCallbacks(this, this.onDown, this.onUp);
        this.game.input.mouse.capture = true;
        this.game.canvas.oncontextmenu = (e) => { e.preventDefault(); };

        this.gameOver = false;
        this.pingTime = 0;
        this.alertQueue = [];
        this.players = {};
        this.flags = [];
        this.isDown = {};
        this.nextFrame = 0;
        this.isShowMenu = false;

        this.skills = {
            hook: {
                name: 'hook',
                img: Assets.Images.ImagesAttackHook.getName(),
                button: 'LMB',
                cooldown: 0,
                ui: {},
            },
            sword: {
                name: 'sword',
                img: Assets.Images.ImagesAttackSword.getName(),
                button: 'RMB',
                cooldown: 0,
                ui: {},
            },
        };

        /* Initialise menu stuff */
        this.buttonUtil = new ButtonUtil(this.game);

        this.flagGroup = this.game.add.group();
        this.skillGroup = this.game.add.group();
        this.playerGroup = this.game.add.group();
        this.weaponGroup = this.game.add.group();
        this.healthBarGroup = this.game.add.group();
        this.particleGroup = this.game.add.group();
        this.soundGroup = this.game.add.group();
        this.uiGroup = this.game.add.group();
        this.initMenu();

        this.socket.emit('join_game', this.room);
    }

    public init(socket: any, room: string): void {
        // this.game.stage.disableVisibilityChange = true;
        this.client_id = socket.id;

        /* Initialise socket and set up listeners */
        this.socket = socket;
        this.registerSocketEvents(socket);

        this.room = room;


        $(document).ready(() => {
            $('#chatlogs').on('scroll', function(){
                $('#chatlogs').data('scrolled', true);
            });
        });
    }

    private getTeamName(team: number): string {
        if (team === Game.BLUE) {
            return 'Blue';
        } else {
            return 'Red';
        }
    }

    private registerSocketEvents(socket: any): void {
        socket.on('loaded', (data: any) => {
            this.onLoaded(data);
        });

        socket.on('update', (data: any) => {
            this.onTick(data);
        });

        socket.on('player_join', (data: any) => {
            this.addPlayer(data);
        });

        socket.on('player_left', (id: string) => {
            console.log(id);
            this.removePlayer(id);
        });

        socket.on('captured_flag', (team) => {
            let teamName = this.getTeamName(team);
            this.addAndPlayAlert(`${teamName} team's flag has been captured!`);
        });

        socket.on('dropped_flag', (team) => {
            let teamName = this.getTeamName(team);
            this.addAndPlayAlert(`${teamName} team's flag has been dropped!`);
        });

        socket.on('returned_flag', (team) => {
            let teamName = this.getTeamName(team);
            this.addAndPlayAlert(`${teamName} team's flag has been returned to their base!`);
        });

        socket.on('score', (team) => {
            this.numCaptures[team]++;
            let teamName = this.getTeamName(team);
            this.addAndPlayAlert(`${teamName} team has secured the enemy flag back to their base!`);
        });

        socket.on('game_end', (data) => {
            this.gameOver = true;
            for (let id in this.players) {
                let player = this.players[id];
                if (!player) continue;
                player.sprite.animations.stop(null, true);
            }
            this.gameTime = 0;

            let endText;
            if (this.numCaptures[Game.BLUE] === this.numCaptures[Game.RED]) {
                endText = 'DRAW!';
            } else if (this.numCaptures[Game.BLUE] > this.numCaptures[Game.RED]) {
                endText = 'BLUE WINS!';
            } else {
                endText = 'RED WINS!';
            }
            this.addAndPlayAlert(endText);

            // TODO replace menu with proper game over menu
            this.game.time.events.add(2000, () => {
                this.quitGame.setVisible();
            });
        });

        socket.on('pongcheck', () => {
            this.pingTime = Math.round(Date.now() - this.pingStartTime);
        });
        this.game.time.events.loop(Phaser.Timer.SECOND * 0.5, this.ping, this);





        // testing send message to server
        setInterval(() => {
            socket.emit('chatroom_msg', 'testing message');
        }, 500);

        // receive a chatroom message to be display in the chatroom
        socket.on('chatroom_msg', (data) => {
            console.log('chatroom_msg', data.sender, data.msg);
            // display message
            $(document).ready(() => {
                let chatlogs = $('#chatlogs');
                chatlogs.append(
                '<div class="msg incoming">' +
                  '<div class="sender-name">' + this.players[data.sender].nameText.text + '</div>' +
                  '<div class="content">' + data.msg + '</div>' +
                '</div>'
                );
                if (!($('#chatlogs').data('scrolled'))) {
                    console.log('auto scroll', $('#chatlogs').prop('scrollHeight'));
                    $('#chatlogs').animate({ scrollTop: $('#chatlogs').prop('scrollHeight') }, "slow");
                }
            });
        });
    }

    private sendMessage(text: string) {
        this.socket.emit('chatroom_msg', 'testing message');
        let chatlogs = document.getElementById('chatlogs');
        chatlogs.insertAdjacentHTML('beforeend',
        '<div class="msg outgoing">' +
          '<div class="sender-name">' + this.players[this.socket.id].nameText.text + '</div>' +
          '<div class="content">' + text + '</div>' +
        '</div>'
        );
        chatlogs.scrollTop = chatlogs.scrollHeight;
    }

    private addAndPlayAlert(text: string) {
        this.alertQueue.push(text);
        this.playNextAlert();
    }

    private playNextAlert() {
        let alertText = this.alertText;

        if (alertText.visible || this.alertQueue.length === 0) {
            return;
        }

        alertText.visible = true;
        let message: string = this.alertQueue.shift();

        alertText.alpha = 0;
        alertText.text = message;

        let tween1 = this.game.add.tween(alertText).to({ alpha: 1 }, 1000, 'Linear', true);
        tween1.start();

        tween1.onComplete.add(() => {
            let tween2 = this.game.add.tween(alertText).to({ alpha: 0 }, 2000, 'Linear', true, 2000);
            tween2.onComplete.add(() => {
                alertText.visible = false;
                this.playNextAlert();
            }, this);
        }, this);
    }

    private removePlayer(id: string): void {
        let player = this.players[id];
        if (!player) return;

        console.log('player left');
        this.playerGroup.remove(player.sprite);
        this.weaponGroup.remove(player.weaponGroup);
        player.destroy();
        delete this.players[id];
    }

    private onLoaded(data: any): void {
        this.loadUI();
        this.loadPlayers(data.players);
        this.loadWorld(data.world);
        this.loadTerrain(data.terrain);
        this.loadFlags(data.flags);
        this.numCaptures = data.scores;
        this.gameTime = data.gameTime;

        // Sprite ordering
        this.game.world.sendToBack(this.flagGroup);
        this.game.world.sendToBack(this.terrainLayer);
        this.game.world.sendToBack(this.mapLayer);
    }

    public update(): void {
        let data = this.data;
        if (!data) return;

        this.gameTime = data.time;

        for (let update of data.players) {
            let player = this.players[update.id];
            if (!player) continue;
            player.update(update);
        }

        this.game.world.bringToTop(this.playerGroup);
        this.game.world.bringToTop(this.weaponGroup);
        this.game.world.bringToTop(this.particleGroup);
        this.game.world.bringToTop(this.healthBarGroup);
        this.game.world.bringToTop(this.skillGroup);
        this.game.world.bringToTop(this.uiGroup);
        this.game.world.bringToTop(this.menuGroup);
        this.game.world.bringToTop(this.soundGroup);

        this.drawUI();
    }

    private onTick(data: any): void {
        this.data = data;

        // Do this here instead of update because indicators get blurry from updating too quickly :(
        // update the position of the flags
        for (let update of data.flags) {
            let flag = this.flags[update.colorIdx];
            if (!flag) continue;
            flag.update(update);
        }
    }

    private ping(): void {
        this.pingStartTime = Date.now();
        this.socket.emit('pingcheck');
    }

    private getCoordinates(layer: Phaser.TilemapLayer, pointer: Phaser.Pointer): void {
        console.log(layer, pointer);
    }

    /*
     * Adds a new player to the game
     * Creates a sprite for the player and populates list of players
     * on the client
     *
     * player: A player object from the server
     */
    private addPlayer(data: any): void {
        if (this.players[data.id]) return;

        let player = new Player(this, data.x, data.y, data.id, data.name, data.team);
        this.players[data.id] = player;

        // if this is the client's player, set the colour to be limegreen
        if (player.id === this.client_id) {
            this.me = player;
            player.nameText.addColor('#32CD32', 0);
            this.world.camera.follow(player.sprite);
        }

        this.playerGroup.add(player.sprite);
        this.weaponGroup.add(player.weaponGroup);
        this.healthBarGroup.add(player.healthBar);
        this.particleGroup.add(player.bloodEmitter);
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
            case 27:    // escape
                if (!this.gameOver) {
                    if (this.isShowMenu === false) {
                        this.showMenu(true);
                    } else {
                        this.showMenu(false);
                    }
                }
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
            let newFlag = new Flag(this, f.x, f.y, f.colorIdx, f.captured);
            this.flags[f.colorIdx] = newFlag;
            this.flagGroup.add(newFlag.sprite);
        }
    }

    private loadPlayers(players: any): void {
        for (let player of players) {
            this.addPlayer(player);
        }
    }

    private loadWorld(world: number[][]): void {
        let data: string = this.parseLayer(world);

        this.game.load.tilemap('world', null, data, Phaser.Tilemap.CSV);
        this.map = this.game.add.tilemap('world', 64, 64);
        this.map.addTilesetImage('tilesheet', 'world.[64,64]');
        this.game.world.setBounds(0, 0, 768 * 2, 640 * 2);

        let layer: Phaser.TilemapLayer = this.map.createLayer(0);
        this.mapLayer = layer;
        layer.inputEnabled = true;

        // layer.events.onInputUp.add(this.getCoordinates);
        layer.events.onInputDown.add(this.onWorldClick.bind(this));
    }

    private drawUI(): void {
        // Ping
        this.pingText.text = `Ping: ${this.pingTime}ms`;

        // Game time
        let minutes: string = (Math.floor(this.gameTime / 60)).toString();
        let seconds: string = (Math.round(this.gameTime) % 60).toString();
        if (parseInt(minutes) < 10)  minutes = '0' + minutes;
        if (parseInt(seconds) < 10)  seconds = '0' + seconds;
        this.gameTimeText.text = `${minutes}:${seconds}`;

        // Score text
        this.blueScoreText.text = this.numCaptures[Game.BLUE].toString();
        this.redScoreText.text = this.numCaptures[Game.RED].toString();

        // Skills
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
        // Ping
        this.pingText = this.game.add.text(0, 0, '', {
            font: '8px ' + Assets.GoogleWebFonts.Roboto,
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
        });

        // Alert text
        this.alertText = this.game.add.text(this.game.width / 2, this.game.height / 6, '', {
            font: '26px Arial',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
            wordWrap: true,
            wordWrapWidth: this.game.width,
            align: 'center',
        });
        this.alertText.anchor.setTo(0.5, 0);
        this.alertText.visible = false;

        // Game time
        this.gameTimeText = this.game.add.text(this.game.width / 2, 0, '', {
            font: '12px Arial',
            fill: '#333333',
        });
        this.gameTimeText.anchor.setTo(0.5, 0);

        // Score text
        this.blueScoreText = this.game.add.text(this.game.width / 2 + 47, 3, '', {
            font: 'bold 26px Arial',
            fill: '#0068bd',
        });
        this.blueScoreText.anchor.setTo(0.5, 0);

        this.redScoreText = this.game.add.text(this.game.width / 2 - 47, 3, '', {
            font: 'bold 26px Arial',
            fill: '#bd0000',
        });
        this.redScoreText.anchor.setTo(0.5, 0);

        // Score overlay
        this.scoreOverlay = this.game.add.image(this.game.width / 2, 0, Assets.Images.ImagesScoreOverlay.getName());
        this.scoreOverlay.anchor.setTo(0.5, 0);
        this.scoreOverlay.scale.setTo(0.22);

        this.uiGroup.fixedToCamera = true;
        this.uiGroup.add(this.scoreOverlay);
        this.uiGroup.add(this.redScoreText);
        this.uiGroup.add(this.blueScoreText);
        this.uiGroup.add(this.gameTimeText);
        this.uiGroup.add(this.alertText);
        this.uiGroup.add(this.pingText);

        // Skills
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

            let overlayImg: Phaser.Image = this.game.add.image(centerX, centerY + height / 2, Assets.Images.ImagesSkillCooldownOverlay.getName());
            overlayImg.width = width;
            overlayImg.height = height;
            overlayImg.alpha = 0.5;
            overlayImg.anchor.setTo(0.5, 1);
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

            this.skillGroup.add(skillImg);
            this.skillGroup.add(overlayImg);
            this.skillGroup.add(text);
            this.skillGroup.add(buttonText);
        }

        this.skillGroup.fixedToCamera = true;
        this.skillGroup.cameraOffset = new Phaser.Point(this.game.width / 2 - this.skillGroup.width / 2 + width / 2,
                                                     this.game.height - (height / 2));
    }

    private onWorldClick(layer: Phaser.TilemapLayer, pointer: Phaser.Pointer): void {
        let id = this.socket.id;
        let me: Player = this.players[id];
        if (!me) return;

        let camera: Phaser.Camera = this.game.camera;
        let mouseX: number = (pointer.x + camera.position.x) / camera.scale.x;
        let mouseY: number = (pointer.y + camera.position.y) / camera.scale.y;

        if (pointer.leftButton.isDown && this.skills.hook.cooldown === 0) {
            let angle = Math.atan2(mouseY - me.sprite.y, mouseX - me.sprite.x);
            this.socket.emit('attack_hook', angle);
        }
        if (pointer.rightButton.isDown && this.skills.sword.cooldown === 0) {
            let angle = Math.atan2(mouseY - me.sprite.y, mouseX - me.sprite.x);
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

    /*
     * Show or hide escape menu
     */
    private showMenu(show: boolean): void {
        this.isShowMenu = show;
        if (this.isShowMenu === true) {
            this.soundGroup.visible = true;
            this.quitGame.setVisible();
        }

        if (this.isShowMenu === false) {
            this.soundGroup.visible = false;
            this.quitGame.hide();
        }
    }

    private initMenu(): void {
        this.soundGroup = this.buttonUtil.createSoundBar();
        this.soundGroup.visible = false;
        let button = this.buttonUtil.createButton(this.game.camera.width / 2, this.game.camera.height / 2 + 64, this, this.quit);
        let text = this.buttonUtil.createText(button.x, button.y, 'Quit game');
        this.quitGame = new CustomButton(button, text);
        this.quitGame.hide();
        this.quitGame.fixToCamera();

        this.menuGroup = this.game.add.group();
        this.menuGroup.add(button);
        this.menuGroup.add(text);
    }

    private quit(): void {
        this.socket.emit('game_quit');
        this.unsubscribeAll();

        for (let player in this.players) {
            this.removePlayer(this.players[player].id);
        }
        this.game.state.start('mainmenu', true, false, this.socket);
    }

    private unsubscribeAll(): void {
        this.socket.off('loaded');
        this.socket.off('update');
        this.socket.off('player_join');
        this.socket.off('player_left');
        this.socket.off('pongcheck');
        this.socket.off('score');
        this.socket.off('captured_flag');
        this.socket.off('dropped_flag');
        this.socket.off('game_end');
    }

    public preload(): void {
        // load the map
        // this.game.load.tilemap('world', null, this.game.cache.getJSON('mymap'), Phaser.Tilemap.TILED_JSON);
        // this.game.physics.startSystem(Phaser.Physics.ARCADE);
    }
}
