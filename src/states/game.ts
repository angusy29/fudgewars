import * as Assets from '../assets';
import * as io from 'socket.io-client';
import Player from './player';
import Flag from './flag';
import Item from './item';
import HealthPot from './healthpot';
import CooldownPot from './cooldownpot';
import ButtonUtil from './buttonutil';
import CustomButton from './custombutton';

import * as $ from 'jquery';

// TODO have a single file for both server/client constants?
const COOLDOWNS = {
    hook: 5,
    sword: 0.5,
};

const FREE_FOLLOW = -1; // SpectateIndex = -1 means camera is in free follow mode
const FREE_FOLLOW_MOVE_SPEED = 6;

/*
 * The actual game client
 */
export default class Game extends Phaser.State {
    private data: any;
    private isSpectating: boolean;
    private currentlySpectatingIndex: number;
    private currentlySpectatingId: string;
    private spectatingText: Phaser.Text;

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
    private players: any;               // all players, mapping from socket id to player object
    private flags: Flag[];              // red flag and blue flag
    private items: any;        // items on the map

    private flagGroup: Phaser.Group;
    private baseGroup: Phaser.Group;
    private skillGroup: Phaser.Group;
    private playerGroup: Phaser.Group;
    private weaponGroup: Phaser.Group;
    private healthBarGroup: Phaser.Group;
    private particleGroup: Phaser.Group;
    private scoreBoardGroup: Phaser.Group;
    private scoreBoardData: any;
    private miniMapGroup: Phaser.Group;
    private miniMapData: any;
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

    private chatboxOn = false;

    public create(): void {
        // on down keypress, call onDown function
        // on up keypress, call the onUp function
        this.input.keyboard.addCallbacks(this, this.onDown, this.onUp);
        this.game.input.mouse.capture = true;
        this.game.canvas.oncontextmenu = (e) => { e.preventDefault(); };

        this.isSpectating = false;
        this.currentlySpectatingIndex = null;
        this.currentlySpectatingId = null;
        this.gameOver = false;
        this.pingTime = 0;
        this.alertQueue = [];
        this.players = {};
        this.flags = [];
        this.items = {};
        this.isDown = {};
        this.nextFrame = 0;
        this.isShowMenu = false;

        this.scoreBoardData = {};
        this.scoreBoardData.blueText = [];
        this.scoreBoardData.redText = [];

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
        this.baseGroup = this.game.add.group();
        this.skillGroup = this.game.add.group();
        this.playerGroup = this.game.add.group();
        this.weaponGroup = this.game.add.group();
        this.healthBarGroup = this.game.add.group();
        this.particleGroup = this.game.add.group();
        this.soundGroup = this.game.add.group();
        this.scoreBoardGroup = this.game.add.group();
        this.miniMapGroup = this.game.add.group();
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
            $('#down-btn').on('click', () => {
                let chatlogs = $('#chatlogs');
                if (chatlogs.data('scrolled') === undefined) {
                  $('#chatlogs').data('scrolled', true);
                } else {
                    $('#chatlogs').data('scrolled', !($('#chatlogs').data('scrolled')));
                    $('#down-btn').toggleClass('text-muted');
                }
            });

            $('#chatbox_form').submit((event) => {
                event.preventDefault();
                // console.log($('#chatbox_input').val());
                this.sendMessage($('#chatbox_input').val());
                $('#chatbox_input').val('');
            });

            $('#chatbox').removeClass('hidden');

            $('#chatbox-tab').on('click', () => {
                this.toggleChatbox();
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

    private freeSpectate(): void {
        this.world.camera.unfollow();
        this.currentlySpectatingIndex = FREE_FOLLOW;
        this.currentlySpectatingId = null;
    }

    private spectatePlayer(index: number): void {
        if (Object.keys(this.players).length > index) {
            let player = this.players[Object.keys(this.players)[index]];
            this.currentlySpectatingIndex = index;
            this.currentlySpectatingId = player.id;
            this.world.camera.follow(player.sprite);
        }
    }

    private registerSocketEvents(socket: any): void {
        socket.on('loaded', (data: any) => {
            this.onLoaded(data);
        });

        socket.on('player_spectating', (id: number) => {
            if (id === this.socket.id) {
                this.isSpectating = true;
                this.spectatePlayer(0);
            }
        });

        socket.on('update', (data: any) => {
            this.onTick(data);
        });

        socket.on('player_join', (data: any) => {
            this.addPlayer(data);
            if (this.isSpectating && this.currentlySpectatingIndex === null && this.currentlySpectatingId === null) {
                this.spectatePlayer(0);
            }
        });

        socket.on('player_left', (id: string) => {
            console.log(id);
            this.removePlayer(id);
            if (id === this.currentlySpectatingId) {
                let numPlayers = Object.keys(this.players).length;
                this.spectatePlayer((this.currentlySpectatingIndex + 1) % numPlayers);
            }
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

        // receive a chatroom message to be display in the chatroom
        socket.on('chatroom_msg', (data) => {
            // console.log('chatroom_msg', data.sender, data.msg);
            // display message
            $(document).ready(() => {
                let chatlogs = $('#chatlogs');
                let playerName = this.players[data.sender].nameText.text;
                if (playerName === '')
                    playerName = 'no name';
                chatlogs.append(
                '<div class="msg incoming">' +
                  '<div class="sender-name">' + playerName + '</div>' +
                  '<div class="content">' + data.msg + '</div>' +
                '</div>'
                );

                // console.log($('#chatlogs').data('scrolled') === undefined, $('#chatlogs').data('scrolled') == false);
                if ($('#chatlogs').data('scrolled') === undefined || $('#chatlogs').data('scrolled') === false) {
                    // console.log('auto scroll', $('#chatlogs').prop('scrollHeight'));
                    $('#chatlogs').animate({ scrollTop: $('#chatlogs').prop('scrollHeight') }, 100);
                }
            });
        });
    }

    private toggleChatbox(): void {
        this.chatboxOn = !(this.chatboxOn);
        $('#chatbox').toggleClass('minimize');
        if (!($('#chatbox').hasClass('minimize'))) {
            $('#chatbox_input').focus();
        }
    }

    private sendMessage(text: string): void {
        if (text !== '') {
            this.socket.emit('chatroom_msg', text);
            let chatlogs = $('#chatlogs');
            let playerName = this.players[this.socket.id].nameText.text;
            if (playerName === '')
                playerName = 'no name';
            chatlogs.append(
            '<div class="msg outgoing">' +
              '<div class="sender-name">' + playerName + '</div>' +
              '<div class="content">' + text + '</div>' +
            '</div>'
            );
            $('#chatlogs').animate({ scrollTop: $('#chatlogs').prop('scrollHeight') }, 100);
        }
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
        this.loadMiniMap(data);
        this.loadPlayers(data.players);
        this.loadWorld(data.world);
        this.loadTerrain(data.terrain);
        this.loadFlags(data.flags);
        this.loadBases(data.bases);
        this.numCaptures = data.scores;
        this.gameTime = data.gameTime;

        // Sprite ordering
        this.game.world.sendToBack(this.flagGroup);
        this.game.world.sendToBack(this.baseGroup);
        this.game.world.sendToBack(this.terrainLayer);
        this.game.world.sendToBack(this.mapLayer);

        // Set Chatbox colour
        if (data.teamId === Game.RED) {
            $('#chatbox').addClass('red');
        } else if (data.teamId === Game.BLUE) {
            $('#chatbox').addClass('blue');
        }
    }

    public update(): void {
        let data = this.data;
        if (!data) return;

        this.gameTime = data.time;

        let blueText = [];
        let redText = [];

        for (let update of data.players) {
            let player = this.players[update.id];
            if (!player) continue;
            player.update(update);
            if (player.team === Game.BLUE) {
                blueText.push({text: player.kills + '/' + player.deaths + ' ' + player.name, kills: player.kills});
            } else if (player.team === Game.RED) {
                redText.push({text: player.kills + '/' + player.deaths + ' ' + player.name, kills: player.kills});
            }
        }

        blueText.sort((a, b) => (b.kills - a.kills));
        redText.sort((a, b) => (b.kills - a.kills));

        for (let i = 0; i < 6; i++) {
            if (this.scoreBoardData.blueText[i]) {
                if (i < blueText.length) {
                    this.scoreBoardData.blueText[i].text = blueText[i].text;
                } else {
                    this.scoreBoardData.blueText[i].text = '';
                }
            }
            if (this.scoreBoardData.redText[i]) {
                if (i < redText.length) {
                    this.scoreBoardData.redText[i].text = redText[i].text;
                } else {
                    this.scoreBoardData.redText[i].text = '';
                }
            }
        }

        this.moveSpectateCamera();

        this.game.world.bringToTop(this.playerGroup);
        this.game.world.bringToTop(this.weaponGroup);
        this.game.world.bringToTop(this.particleGroup);
        this.game.world.bringToTop(this.healthBarGroup);
        this.game.world.bringToTop(this.skillGroup);
        this.game.world.bringToTop(this.scoreBoardGroup);
        this.game.world.bringToTop(this.uiGroup);
        this.game.world.bringToTop(this.menuGroup);
        this.game.world.bringToTop(this.soundGroup);

        this.drawUI();
    }

    private moveSpectateCamera(): void {
        if (this.isSpectating && this.currentlySpectatingIndex === FREE_FOLLOW) {
            if (this.isDown[87]) { // w
                this.game.camera.y -= FREE_FOLLOW_MOVE_SPEED;
            }
            if (this.isDown[65]) { // a
                this.game.camera.x -= FREE_FOLLOW_MOVE_SPEED;
            }
            if (this.isDown[83]) { // s
                this.game.camera.y += FREE_FOLLOW_MOVE_SPEED;
            }
            if (this.isDown[68]) { // d
                this.game.camera.x += FREE_FOLLOW_MOVE_SPEED;
            }
        }
    }

    private onTick(data: any): void {
        this.data = data;
        this.drawMiniMap(data);
        // Do this here instead of update because indicators get blurry from updating too quickly :(
        // update the position of the flags
        for (let update of data.flags) {
            let flag = this.flags[update.colorIdx];
            if (!flag) continue;
            flag.update(update);
        }

        for (let item of data.items) {
            if (!this.items[item.id]) {
                if (item.type === 'health') {
                    this.items[item.id] = new HealthPot(this, item.x, item.y);
                } else if (item.type === 'cooldown') {
                    this.items[item.id] = new CooldownPot(this, item.x, item.y);
                }
            }

            if (this.items[item.id] && item.isPickedUp) {
                this.items[item.id].destroy();
                delete this.items[item.id];
            }
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

        let player = new Player(this, data.x, data.y, data.id, data.name, data.team, data.accessoryTile);
        this.players[data.id] = player;

        // if this is the client's player, set the colour to be limegreen
        if (player.id === this.client_id) {
            this.me = player;
            player.nameText.addColor('#32CD32', 0);
            this.world.camera.follow(player.sprite);

            $(document).ready(() => {
                $('#down-btn').on('click', () => {
                    let chatlogs = $('#chatlogs');
                    if (chatlogs.data('scrolled') === undefined) {
                      $('#chatlogs').data('scrolled', true);
                    } else {
                        $('#chatlogs').data('scrolled', !($('#chatlogs').data('scrolled')));
                        $('#down-btn').toggleClass('text-muted');
                    }
                });

                $('#chatbox_form').submit((event) => {
                    event.preventDefault();
                    // console.log($('#chatbox_input').val());
                    this.sendMessage($('#chatbox_input').val());
                    $('#chatbox_input').val('');
                });

                $('#chatbox').removeClass('hidden');

                $('#chatbox-tab').on('click', () => {
                    this.toggleChatbox();
                });

                if (player.team === 1) {
                    $('#chatbox').addClass('red');
                    $('#chatbox').removeClass('blue');
                } else {
                    $('#chatbox').addClass('blue');
                    $('#chatbox').removeClass('red');

                }
            });
        }

        this.playerGroup.add(player.sprite);
        if (player.accessory) this.playerGroup.add(player.accessory);
        this.weaponGroup.add(player.weaponGroup);
        this.healthBarGroup.add(player.healthBar);
        this.particleGroup.add(player.bloodEmitter);
    }

    /*
     * Callback for when key is pressed down
     */
    private onDown(e: KeyboardEvent): void {
        switch (e.keyCode) {
            case 27:    // escape
                if (!this.gameOver) {
                    if (this.isShowMenu === false) {
                        this.showMenu(true);
                    } else {
                        this.showMenu(false);
                    }
                }
                break;
            case 9:    // tab
                if (!this.chatboxOn) {
                    this.scoreBoardGroup.visible = true;
                }
                e.preventDefault();
                break;
            case 18:     // alt, to toggle chatbox
                this.toggleChatbox();
                e.preventDefault();
                break;
            default:
                break;
        }

        if (!this.isSpectating) {
            if (this.isDown[e.keyCode]) {
                e.preventDefault();
                return;
            }
            switch (e.keyCode) {
                case 87:    // w
                    if (!this.chatboxOn) this.socket.emit('keydown', 'up');
                    break;
                case 65:    // a
                    if (!this.chatboxOn) this.socket.emit('keydown', 'left');
                    break;
                case 83:    // s
                    if (!this.chatboxOn) this.socket.emit('keydown', 'down');
                    break;
                case 68:    // d
                    if (!this.chatboxOn) this.socket.emit('keydown', 'right');
                    break;
            }
        }

        this.isDown[e.keyCode] = true;
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
            case 9:    // tab
                this.scoreBoardGroup.visible = false;
                e.preventDefault();
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

    private loadBases(bases: any): void {
        for (let key in bases) {
            let {team, x, y} = bases[key];
            let img = this.game.add.graphics(x - 32 + 3, y - 32);
            if (team === Game.BLUE) {
                img.lineStyle(5, 0x1f95da, 0.5);
            } else {
                img.lineStyle(5, 0xe05414, 0.5);
            }
            img.drawCircle(32, 32, 32);
            this.baseGroup.add(img);
        }
    }

    private loadFlags(flags: any): void {
        for (let f of flags) {
            let newFlag = new Flag(this, f.x, f.y, f.colorIdx, f.captured);
            this.flags[f.colorIdx] = newFlag;
            this.flagGroup.add(newFlag.sprite);
        }
    }

    private loadMiniMap(data: any): void {
        this.miniMapData = {
            mapHeight: 64 * data.world.length,
            mapWidth: 64 * data.world[0].length,
            playerId: data.playerId,
            teamId: data.teamId,
            bg: null,   // mini map background
            self: null, // current player image
            team: [],   // array of team images
            flag: {},  // teamId: team flag image
            base: {},  // teamId: team base image
            enemy: [],
        };
        let teamId = data.teamId;
        let mmd = this.miniMapData;
        let mmg = this.miniMapGroup;
        let flagRed = Assets.Images.ImagesFlagRed.getName();
        let baseRed = Assets.Images.ImagesBaseRed.getName();
        let selfRed = Assets.Images.ImagesSelfRed.getName();
        let teamRed = Assets.Images.ImagesTeamRed.getName();
        let flagBlue = Assets.Images.ImagesFlagBlue.getName();
        let baseBlue = Assets.Images.ImagesBaseBlue.getName();
        let selfBlue = Assets.Images.ImagesSelfBlue.getName();
        let teamBlue = Assets.Images.ImagesTeamBlue.getName();
        let self = Game.BLUE === teamId ? selfBlue : selfRed;
        let team = Game.BLUE === teamId ? teamBlue : teamRed;
        let enemy = teamBlue;
        // Background
        mmg.add(mmd.bg = this.game.add.graphics(0, 0));
        // Bases
        mmd.base[data.bases[0].team] = {...data.bases[0], img: null};
        mmd.base[data.bases[1].team] = {...data.bases[1], img: null};
        mmg.add(mmd.base[Game.BLUE].img = this.game.add.image(0, 0, baseBlue));
        mmg.add(mmd.base[Game.RED].img = this.game.add.image(0, 0, baseRed));
        // Team members
        for (let i = 0; i < 5; i++) {
            let img = this.game.add.image(0, 0, team);
            mmd.team.push(img);
            mmg.add(img);
        }
        for (let i = 0; i < 5; i++) {
            let img = this.game.add.image(0, 0, enemy);
            img.visible = false;
            mmd.enemy.push(img);
            mmg.add(img);
        }
        // Self
        mmg.add(mmd.self = this.game.add.image(0, 0, self));
        // Flags
        mmg.add(mmd.flag[Game.BLUE] = this.game.add.image(0, 0, flagBlue));
        mmg.add(mmd.flag[Game.RED] = this.game.add.image(0, 0, flagRed));
        mmg.fixedToCamera = true;

    }

    private drawMiniMap(data: any): void {
        let {mapHeight, mapWidth, playerId, teamId, bg, self, team, flag, base, enemy}
            = this.miniMapData;

        let maxWidth = 0.3 * this.game.width;
        let maxHeight = 0.3 * this.game.height;
        let scale = Math.min(maxWidth / mapWidth, maxHeight / mapHeight);
        let width = mapWidth * scale;
        let height = mapHeight * scale;
        let x = 0; // this.game.width - width;
        let y = 0; // this.game.height - height;

        // Position and Draw mini map
        this.miniMapGroup.cameraOffset.x = x;
        this.miniMapGroup.cameraOffset.y = y;
        this.game.world.bringToTop(this.miniMapGroup);
        bg.clear();
        bg.alpha = 0.7;
        bg.lineStyle(1, 0x000000, 1);
        bg.beginFill(0xffffff);
        bg.drawRect(0, 0, width, height);
        bg.endFill();

        // Position bases
        for (let key in base) {
            let {x, y, img} = base[key];
            img.x = x * scale;
            img.y = y * scale;
        }

        // Position flag
        for (let update of data.flags) {
            let img = flag[update.colorIdx];
            img.x = (update.x * scale) + 5;
            img.y = update.y * scale;
        }

        // Position players
        let teamTotal = 0;  // number of team players not counting self
        let enemyTotal = 0;
        for (let update of data.players) {
            let {id, x, y} = update;
            if (!this.isSpectating) {
                if (id === playerId) {
                    self.x = x * scale;
                    self.y = y * scale;
                } else if (update.team === teamId) {
                    team[teamTotal].x = x * scale;
                    team[teamTotal].y = y * scale;
                    team[teamTotal].visible = true;
                    teamTotal++;
                }
            } else {
                if (update.team === Game.RED) {
                    team[teamTotal].x = x * scale;
                    team[teamTotal].y = y * scale;
                    team[teamTotal].visible = true;
                    teamTotal++;
                } else if (update.team === Game.BLUE) {
                    enemy[enemyTotal].x = x * scale;
                    enemy[enemyTotal].y = y * scale;
                    enemy[enemyTotal].visible = true;
                    enemyTotal++;
                }
            }
        }
        for ( ; teamTotal < 5; teamTotal++) {
            team[teamTotal].visible = false;
        }
        for ( ; enemyTotal < 5; enemyTotal++) {
            enemy[enemyTotal].visible = false;
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

        // Spectate text
        if (this.isSpectating) {
            if (this.currentlySpectatingIndex === FREE_FOLLOW) {
                this.spectatingText.text = `Free cam`;
            } else {
                let spectatingPlayer = this.players[this.currentlySpectatingId];
                if (spectatingPlayer) {
                    this.spectatingText.text = `Spectating ${spectatingPlayer.name}`;
                } else {
                    this.spectatingText.text = '';
                }
            }
        }

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
        if (!this.isSpectating) {
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
        } else {
            for (let skillIndex in this.skillList) {
                let skillName: string = this.skillList[skillIndex];
                let skill = this.skills[skillName];
                if (Object.keys(skill.ui).length === 0) continue;

                let ui = skill.ui;
                ui.overlayImg.visible = false;
                ui.text.text = '';
                ui.skillImg.visible = false;
                ui.overlayImg.visible = false;
                ui.text.visible = false;
                ui.buttonText.visible = false;
            }
        }
    }

    private loadUI(): void {
        // Ping
        this.pingText = this.game.add.text(0, 0, '', {
            font: '8px ' + 'Arial',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
        });

        // Spectate text
        this.spectatingText = this.game.add.text(this.game.width / 2, 60, '', {
            font: '12px ' + 'Arial',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
        });
        this.spectatingText.anchor.setTo(0.5, 0.5);

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

        // Score board
        let center: number = this.game.width / 2;
        let scoreWidth = center - 50;
        let redX = 50;
        let blueX = center;
        let scoreHeight = this.game.height - 50;
        let scoreBackground = this.game.add.graphics(0, 0);
        scoreBackground.fillAlpha = 0.5;
        scoreBackground.beginFill(0xff0000);
        scoreBackground.drawRect(redX, 0, scoreWidth, scoreHeight);
        scoreBackground.endFill();
        scoreBackground.beginFill(0x0000ff);
        scoreBackground.drawRect(blueX, 0, scoreWidth, scoreHeight);
        scoreBackground.endFill();
        scoreBackground.alpha = 0.5;
        this.scoreBoardGroup.add(scoreBackground);
        this.scoreBoardGroup.fixedToCamera = true;
        this.scoreBoardGroup.visible = false;
        this.scoreBoardData.scoreBackground = scoreBackground;
        let textHeight = (this.game.height - 100) / 6;
        for (let i: number = 1; i < 7; i++) {

            let y = textHeight * i;
            let padding = 10;

            let blueScoreText = this.game.add.text(blueX + padding, y, '' + i, {
                font: '26px Arial',
                fill: '#ffffff',
            });
            this.scoreBoardGroup.add(blueScoreText);
            this.scoreBoardData.blueText.push(blueScoreText);

            let redScoreText = this.game.add.text(redX + padding, y, '' + i, {
                font: '26px Arial',
                fill: '#ffffff',
            });
            redScoreText.visible = true;
            this.scoreBoardGroup.add(redScoreText);
            this.scoreBoardData.redText.push(redScoreText);
        }

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
        this.uiGroup.add(this.spectatingText);


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

            let text: Phaser.Text = this.buttonUtil.createText(centerX, centerY, '', 16);
            text.anchor.setTo(0.5);

            let buttonText: Phaser.Text = this.buttonUtil.createText(centerX + width / 2, centerY + height / 2 + 7, skill.button, 8);
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
        if (!this.isSpectating) {
            let id = this.socket.id;
            let me: Player = this.players[id];
            if (!me) return;

            let camera: Phaser.Camera = this.game.camera;
            let mouseX: number = (pointer.x + camera.position.x) / camera.scale.x;
            let mouseY: number = (pointer.y + camera.position.y) / camera.scale.y;

            console.log(pointer);
            if (pointer.leftButton.isDown && this.skills.hook.cooldown === 0) {
                let angle = Math.atan2(mouseY - me.sprite.y, mouseX - me.sprite.x);
                this.socket.emit('attack_hook', angle);
            }
            if (pointer.rightButton.isDown && this.skills.sword.cooldown === 0) {
                let angle = Math.atan2(mouseY - me.sprite.y, mouseX - me.sprite.x);
                this.socket.emit('attack_sword', angle);
            }
        } else {
            let numPlayers = Object.keys(this.players).length;
            let newSpectateIndex = null;
            if (pointer.leftButton.isDown) {
                if (this.currentlySpectatingIndex === null || this.currentlySpectatingIndex === FREE_FOLLOW) {
                    newSpectateIndex = 0;
                } else {
                    newSpectateIndex = (this.currentlySpectatingIndex + 1);
                }
            }
            if (pointer.rightButton.isDown) {
                if (this.currentlySpectatingIndex === null || this.currentlySpectatingIndex === FREE_FOLLOW) {
                    newSpectateIndex = numPlayers - 1;
                } else {
                    newSpectateIndex = (this.currentlySpectatingIndex - 1);
                }
            }
            if (newSpectateIndex !== null) {
                if (newSpectateIndex < 0 || newSpectateIndex >= numPlayers) {
                    this.freeSpectate();
                } else {
                    this.spectatePlayer(newSpectateIndex);
                }
            }
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
        this.socket.off('chatroom_msg');
    }

    public preload(): void {
        // load the map
        // this.game.load.tilemap('world', null, this.game.cache.getJSON('mymap'), Phaser.Tilemap.TILED_JSON);
        // this.game.physics.startSystem(Phaser.Physics.ARCADE);
    }
}
