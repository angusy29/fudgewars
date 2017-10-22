import * as Assets from '../assets';
import * as io from 'socket.io-client';
import CustomButton from './custombutton';
import ButtonUtil from './buttonutil';
import LobbyPlayer from './lobbyplayer';
import Item from './item';
import { Atlases } from '../assets';

/*
 * Lobby where player selects their team
 */
export default class Lobby extends Phaser.State {
    private background: Phaser.Image;
    private socket: any;
    private players: any = {};

    // these group all the tiles on the GUI
    private blueTiles: any = {};
    private redTiles: any = {};
    private greenTiles: any = {};

    // buttons at bottom of page
    private ready: CustomButton;
    private back: CustomButton;
    private spectateBtn: CustomButton;

    // used to pass to game.ts
    private client_player_name: string;

    static readonly MAX_PLAYER_COUNT_PER_TEAM = 6;
    static readonly PLAYER_NAME_Y_OFFSET = 24;
    static readonly BLUE = 0;       // team blue
    static readonly RED = 1;        // team red

    // class used to create buttons
    private buttonUtil: ButtonUtil;

    private room: string;

    static team_sheets: any = [
        Assets.Atlases.ButtonsBlueSheet.Frames.BluePanel,
        Assets.Atlases.ButtonsRedSheet.Frames.RedPanel,
        Assets.Atlases.ButtonsGreenSheet.Frames.GreenCheckmark,
        Assets.Atlases.ButtonsGreenSheet.Frames.GreenPanel
    ];

    public init(socket: any, playername: string, room: string): void {
        this.socket = socket;
        this.client_player_name = playername;
        this.room = room;
        this.players = {};  // need to reset these, otherwise
        this.blueTiles = {};
        this.redTiles = {};

        // gets called whenever a new player is added
        this.socket.on('lobby_update', (data: any) => {
            for (let player of data) {
                if (!this.players[player.id]) {
                    this.addNewPlayer(player);
                }

                // render the tick image next to the player if they are ready
                if (player.isReady) {
                    if (!this.players[player.id]) continue;
                    if (this.players[player.id].readyImg !== null) continue;

                    let obj;
                    if (player.team === Lobby.BLUE) obj = this.blueTiles;
                    else obj = this.redTiles;

                    let tile = this.players[player.id].tile;
                    let posX = obj[tile].image.centerX + 16;
                    let posY = obj[tile].image.centerY + 16;

                    let readyTick = this.game.add.image(posX, posY, Assets.Atlases.ButtonsGreenSheet.getName(),
                                        Lobby.team_sheets[2]);

                    this.players[player.id].readyImg = readyTick;

                    this.players[player.id].sprite.animations.play('walk', 20, true);
                } else if (!player.isReady && this.players[player.id].readyImg !== null) {
                    // destroy tick ready image
                    this.players[player.id].readyImg.destroy();
                    this.players[player.id].readyImg = null;
                    this.players[player.id].sprite.animations.stop(null, true);
                }
            }
        });

        this.socket.on('accessory_added', (data: any) => {
            let player = this.players[data.id];
            player.accessoryTile = data.accessoryTile;

            if (player.accessory) {
                player.accessory.destroy();
            }

            if (player.accessoryTile !== 0) {
                let x = player.sprite.x;
                let y = player.sprite.y;
                player.accessory = this.game.add.sprite(x - LobbyPlayer.ACCESSORY_X_OFFSET, y - LobbyPlayer.ACCESSORY_Y_OFFSET,
                                            Atlases.SpritesheetsItemsSpritesheet.getName(), Item.AccessorySprites[player.accessoryTile]);        
                player.accessory.scale.setTo(0.5, 0.5);
            }
        });

        // when player moves to a new tile
        this.socket.on('player_moved', (player: any) => {
            let playerToMove = this.players[player.id];
            if (!playerToMove) {
                playerToMove = this.addNewPlayer(player);
            }
            let oldteam = playerToMove.team;
            let newteam = player.team;
            let teamtiles;
            let frame;

            if (player.tile === null && player.team === null) {
                playerToMove.sprite.visible = false;
                playerToMove.name.visible = false;
            } else {
                if (player.id === this.socket.id) {
                    this.spectateBtn.setText('Spectate');
                    this.spectateBtn.getText().fontSize = '24px';
                }

                playerToMove.sprite.visible = true;
                playerToMove.name.visible = true;

                if (oldteam === Lobby.BLUE) teamtiles = this.blueTiles;
                if (oldteam === Lobby.RED) teamtiles = this.redTiles;

                // need to clear tile of oldteam
                teamtiles[playerToMove.tile].player = null;

                if (newteam === Lobby.BLUE) {
                    teamtiles = this.blueTiles;
                    frame = 'p2_walk';
                } else if (newteam === Lobby.RED) {
                    teamtiles = this.redTiles;
                    frame = 'p3_walk';
                }

                if (newteam === oldteam) {
                    // if the team is the same, all we need to do is reuse our current character
                    playerToMove.sprite.x = teamtiles[player.tile].image.centerX - 16;
                    playerToMove.sprite.y = teamtiles[player.tile].image.centerY + 16;
                } else {
                    // if the team is different, we need to create a sprite of the other team
                    playerToMove.sprite.destroy();
                    let spritePosX = teamtiles[player.tile].image.centerX - 16;
                    let spritePosY = teamtiles[player.tile].image.centerY + 16;
                    let sprite = this.game.add.sprite(spritePosX, spritePosY, frame);
                    sprite.anchor.setTo(0.5, 0.5);
                    sprite.scale.setTo(0.5);
                    sprite.animations.add('walk');
                    playerToMove.setSprite(sprite);
                }

                playerToMove.team = player.team;
                playerToMove.tile = player.tile;
                playerToMove.name.x = teamtiles[player.tile].image.centerX;
                playerToMove.name.y = teamtiles[player.tile].image.centerY - Lobby.PLAYER_NAME_Y_OFFSET;

                if (player.accessoryTile !== 0 && !playerToMove.accessory) {
                    playerToMove.accessoryTile = player.accessoryTile;
                    playerToMove.accessory = this.game.add.sprite(0, 0, Assets.Atlases.SpritesheetsItemsSpritesheet.getName(),
                                            Item.AccessorySprites[playerToMove.accessoryTile]);
                    playerToMove.accessory.scale.setTo(0.5, 0.5);
                }

                if (playerToMove.accessory) {
                    playerToMove.accessory.x = playerToMove.sprite.x - LobbyPlayer.ACCESSORY_X_OFFSET;
                    playerToMove.accessory.y = playerToMove.sprite.y - LobbyPlayer.ACCESSORY_Y_OFFSET;
                }

                // assign player to the new tile
                teamtiles[playerToMove.tile].player = playerToMove;
            }
        });

        // start the game because everyone is ready
        this.socket.on('lobby_start', () => {
            // console.log('lobby start');
            this.loadGame();
        });

        // when a player leaves the game, gets called
        this.socket.on('lobby_player_left', (id: any) => {
            this.players[id].name.destroy();
            this.players[id].sprite.destroy();
            if (this.players[id].readyImg !== null) this.players[id].readyImg.destroy();
            if (this.players[id].accessory !== null) this.players[id].accessory.destroy();

            if (this.players[id].team === Lobby.BLUE) {
                this.blueTiles[this.players[id].tile].player = null;
            } else {
                this.redTiles[this.players[id].tile].player = null;
            }
            delete this.players[id];
        });
    }

    public create(): void {
        this.buttonUtil = new ButtonUtil(this.game);

        this.background = this.game.add.image(0, 0, 'titlescreen');
        this.background.height = this.game.height;
        this.background.width = this.game.width;

        let title: Phaser.Text = this.buttonUtil.createNormalText(this.game.canvas.width / 2, this.game.canvas.height / 2 * 0.1, this.room, 48);
        title.anchor.setTo(0.5, 0.5);

        this.initBlueTeamPanels();
        this.initRedTeamPanels();
        this.initChangeCharacter();
        this.initReadyButton();
        this.initBackButton();
        this.initSpectateButton();

        this.socket.emit('join_lobby', this.room, this.client_player_name);
    }

    /*
     * Add a new player to the lobby screen
     */
    private addNewPlayer(player: any): void {
        let namePosX = 0;
        let namePosY = 0;
        let spritePosX = 0;
        let spritePosY = 0;
        let tile = 0;

        let teamtiles;
        let frame;
        if (player.team === Lobby.BLUE) {
            teamtiles = this.blueTiles;
            frame = 'p2_walk';
        } else if (player.team === Lobby.RED) {
            teamtiles = this.redTiles;
            frame = 'p3_walk';
        }

        namePosX = teamtiles[player.tile].image.centerX;
        namePosY = teamtiles[player.tile].image.centerY - Lobby.PLAYER_NAME_Y_OFFSET;
        spritePosX = teamtiles[player.tile].image.centerX - 16;
        spritePosY = teamtiles[player.tile].image.centerY + 16;

        // set up label of the player
        let name = this.buttonUtil.createText(namePosX, namePosY, player.name, 14);
        name.anchor.setTo(0.5, 0.5);

        let sprite = this.game.add.sprite(spritePosX, spritePosY, frame);
        sprite.anchor.setTo(0.5, 0.5);
        sprite.scale.setTo(0.5);
        sprite.animations.add('walk');

        this.players[player.id] = new LobbyPlayer(player.id, name, player.team, player.tile, sprite);

        // tell blueTiles or redTiles that someone is on that tile now
        if (player.team === Lobby.BLUE) {
            this.blueTiles[player.tile].player = this.players[player.id];
        }

        if (player.team === Lobby.RED) {
            this.redTiles[player.tile].player = this.players[player.id];
        }

        // if the player has an accessory we add it
        if (player.accessoryTile !== 0) {
            let x = this.players[player.id].sprite.x;
            let y = this.players[player.id].sprite.y;
            this.players[player.id].accessoryTile = player.accessoryTile;
            this.players[player.id].accessory = this.game.add.sprite(x - LobbyPlayer.ACCESSORY_X_OFFSET, y - LobbyPlayer.ACCESSORY_Y_OFFSET,
                                        Atlases.SpritesheetsItemsSpritesheet.getName(), Item.AccessorySprites[this.players[player.id].accessoryTile]);        
            this.players[player.id].accessory.scale.setTo(0.5, 0.5);
        }

        return this.players[player.id];
    }

    private initBlueTeamPanels(): void {
        let label = this.buttonUtil.createNormalText((this.game.canvas.width / 2) - 150, this.game.canvas.height / 2 * 0.25, 'Team Blue', 32);
        label.anchor.setTo(0.5, 0.5);
        let x = (this.game.canvas.width / 2) - 250;
        let y = label.y * 1.5;
        let n: number = 0;
        // 3 rows
        for (let i = 0; i < Lobby.MAX_PLAYER_COUNT_PER_TEAM / 2; i++) {
            // 2 cols
            for (let j = 0; j < Lobby.MAX_PLAYER_COUNT_PER_TEAM / 3; j++) {
                let image = this.game.add.button(x + 100 * j, y + i * 100,
                                Assets.Atlases.ButtonsBlueSheet.getName(), this.bluePanelClick.bind(this, n),
                                this, Lobby.team_sheets[0], Lobby.team_sheets[0], Lobby.team_sheets[0], Lobby.team_sheets[0]);
                image.alpha = 0.9;
                this.blueTiles[n] = {'image': image, 'player': null};
                n++;
            }
        }
    }

    private initRedTeamPanels(): void {
        let label = this.buttonUtil.createText((this.game.canvas.width / 2) + 150, this.game.canvas.height / 2 * 0.25, 'Team Red', 32);
        label.anchor.setTo(0.5, 0.5);
        let x = (this.game.canvas.width / 2) + 50;
        let y = label.y * 1.5;
        let n: number = 0;
        // 3 rows
        for (let i = 0; i < Lobby.MAX_PLAYER_COUNT_PER_TEAM / 2; i++) {
            // 2 cols
            for (let j = 0; j < Lobby.MAX_PLAYER_COUNT_PER_TEAM / 3; j++) {
                let image = this.game.add.button(x + 100 * j, y + 100 * i,
                                Assets.Atlases.ButtonsRedSheet.getName(), this.redPanelClick.bind(this, n),
                                this, Lobby.team_sheets[1], Lobby.team_sheets[1], Lobby.team_sheets[1], Lobby.team_sheets[1]);
                image.alpha = 0.9;
                this.redTiles[n] = {'image': image, 'player': null};
                n++;
            }
        }
    }

    private initChangeCharacter(): void {
        let label = this.buttonUtil.createNormalText(this.game.canvas.width / 2,
                                        (this.blueTiles[5].image.y + this.blueTiles[5].image.height) * 1.05, 'Accessory selection', 24);
        label.anchor.setTo(0.5, 0.5);

        for (let i = 0; i < 5; i++) {
            let panel = this.game.add.button(this.blueTiles[4].image.x + (this.blueTiles[4].image.width * i), label.y * 1.05, 
                                Assets.Atlases.ButtonsGreenSheet.getName(), this.greenPanelClick.bind(this, i), this,
                                Lobby.team_sheets[3], Lobby.team_sheets[3], Lobby.team_sheets[3], Lobby.team_sheets[3]);
            panel.alpha = 0.9;

            let spritePosX = panel.centerX;
            let spritePosY = panel.centerY;

            if (i !== 0) {
                let sprite = this.game.add.sprite(panel.centerX, panel.centerY, Atlases.SpritesheetsItemsSpritesheet.getName(), Item.AccessorySprites[i]);
                sprite.anchor.setTo(0.5, 0.5);
                this.greenTiles[i] = sprite;
            } else {
                this.greenTiles[0] = null;
            }
        }
    }

    private initReadyButton(): void {
        // pick the first button in the array to use as the asset
        let button: Phaser.Button = this.buttonUtil.createButton(this.game.canvas.width / 2 - 108 * 2, this.game.canvas.height * 0.9, this, this.readyOnClick);
        let text: Phaser.Text = this.buttonUtil.createText(button.x, button.y, 'Ready');
        this.ready = new CustomButton(button, text);
        button.onInputOver.add(this.buttonUtil.over.bind(this, this.ready), this);
        button.onInputOut.add(this.buttonUtil.out.bind(this, this.ready), this);
    }

    /*
     * Creates start game button
     * Creates the start game text
     */
    private initBackButton(): void {
        // pick the first button in the array to use as the asset
        let button: Phaser.Button = this.buttonUtil.createButton(this.game.canvas.width / 2 + 108 * 2, this.game.canvas.height * 0.9, this, this.loadBack);
        let text: Phaser.Text = this.buttonUtil.createText(button.x, button.y, 'Back');
        this.back = new CustomButton(button, text);
        button.onInputOver.add(this.buttonUtil.over.bind(this, this.back), this);
        button.onInputOut.add(this.buttonUtil.out.bind(this, this.back), this);
    }

    private initSpectateButton(): void {
        // pick the first button in the array to use as the asset
        let button: Phaser.Button = this.buttonUtil.createButton(this.game.canvas.width / 2, this.game.canvas.height * 0.9, this, this.onSpectateClick);
        let text: Phaser.Text = this.buttonUtil.createText(button.x, button.y, 'Spectate');
        this.spectateBtn = new CustomButton(button, text);
        button.onInputOver.add(this.buttonUtil.over.bind(this, this.spectateBtn), this);
        button.onInputOut.add(this.buttonUtil.out.bind(this, this.spectateBtn), this);
    }

    private onSpectateClick(): void {
        this.game.sound.play('click1');

        this.spectateBtn.setText('Waiting for game to start...');
        this.spectateBtn.getText().fontSize = '16px';

        if (this.players[this.socket.id].readyImg) this.players[this.socket.id].readyImg.destroy();
        if (this.players[this.socket.id].accessory) {
            this.players[this.socket.id].accessory.destroy();
            this.players[this.socket.id].accessory = null;
        }
        this.socket.emit('on_player_spectate');
    }

    private readyOnClick(): void {
        this.game.sound.play('click1');

        if (this.spectateBtn.getText().text === 'Spectate') { // Hacky way to check if spectating
            this.players[this.socket.id].isReady = !this.players[this.socket.id].isReady;

            if (this.players[this.socket.id].isReady) {
                this.ready.setText('Waiting for others...');
                this.ready.getText().fontSize = '16px';
            } else {
                this.ready.setText('Ready');
                this.ready.getText().fontSize = '24px';
            }

            this.socket.emit('player_ready');
        }
    }

    private bluePanelClick(tile: number): void {
        this.game.sound.play('click1');
        if (this.players[this.socket.id].isReady) return;
        this.socket.emit('blue_team_change', tile);
    }

    private redPanelClick(tile: number): void {
        this.game.sound.play('click1');
        if (this.players[this.socket.id].isReady) return;
        this.socket.emit('red_team_change', tile);
    }

    private greenPanelClick(tile: number): void {
        this.game.sound.play('click1');

        // hacks are us, if they are a player emit
        if (this.spectateBtn.getText().text === 'Spectate') this.socket.emit('add_accessory', tile);
    }

    /*
     * Goes back to the main menu
     */
    private loadBack(): void {
        // console.log('press back');
        this.socket.emit('lobby_player_back');
        this.game.sound.play('click1');
        this.unsubscribeAll();
        this.game.state.start('lobbyselection', true, false, this.socket, this.client_player_name);
    }

    /*
     * This is called when server tells client that all
     * players are ready
     */
    private loadGame(): void {
        this.unsubscribeAll();
        this.game.state.start('game', true, false, this.socket, this.room);
    }

    private unsubscribeAll() {
        this.socket.off('lobby_start');
        this.socket.off('lobby_update');
        this.socket.off('lobby_player_left');
        this.socket.off('player_moved');
        this.socket.off('accessory_added');
    }
}
