import * as Assets from '../assets';
import * as io from 'socket.io-client';
import CustomButton from './custombutton';
import ButtonUtil from './buttonutil';
import LobbyPlayer from './lobbyplayer';

/*
 *  Welcome screen when user arrives at Fudge Wars website
 */
export default class Lobby extends Phaser.State {
    private background: Phaser.Image;
    private socket: any;
    private players: any = {};

    // these group all the tiles on the GUI
    private blueTiles: any = {};
    private redTiles: any = {};

    // buttons at bottom of page
    private ready: CustomButton;
    private back: CustomButton;

    // used to pass to game.ts
    private client_player_name: string;

    static readonly MAX_PLAYER_COUNT_PER_TEAM = 6;
    static readonly PLAYER_NAME_Y_OFFSET = 24;
    static readonly BLUE = 0;       // team blue
    static readonly RED = 1;        // team red

    // class used to create buttons
    private buttonUtil: ButtonUtil;

    static team_sheets: any = [
        Assets.Atlases.ButtonsBlueSheet.Frames.BluePanel,
        Assets.Atlases.ButtonsRedSheet.Frames.RedPanel,
        Assets.Atlases.ButtonsGreenSheet.Frames.GreenCheckmark
    ];

    public init(playername: string): void {
        this.client_player_name = playername;
        this.players = {};  // need to reset these, otherwise
        this.blueTiles = {};
        this.redTiles = {};

        this.socket = io.connect();

        this.socket.on('lobby_update', (data: any) => {
            for (let player of data) {
                if (!this.players[player.id]) {
                    this.addNewPlayer(player);
                }

                // create tick ready image
                if (player.isReady) {
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

        this.socket.on('player_moved', (player: any) => {
            console.log(this.players);
            let playerToMove = this.players[player.id];
            let oldteam = playerToMove.team;
            let newteam = player.team;
            let teamtiles;
            let frame;

            // need to clear tile of oldteam
            if (oldteam === Lobby.BLUE) teamtiles = this.blueTiles;
            if (oldteam === Lobby.RED) teamtiles = this.redTiles;

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

            // assign player to the new tile
            teamtiles[playerToMove.tile].player = playerToMove;
            console.log(this.players);
        });

        // start the game because everyone is ready
        this.socket.on('lobby_start', () => {
            console.log('lobby start');
            this.unsubscribeAll();
            this.socket.emit('prepare_world');
            this.game.state.start('game', true, false, this.socket);
        });

        this.socket.on('lobby_player_left', (id: any) => {
            console.log('lobby player left');
            this.players[id].name.destroy();
            if (this.players[id].readyImg !== null) this.players[id].readyImg.destroy();

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

        this.initBlueTeamPanels();
        this.initRedTeamPanels();
        this.initReadyButton();
        this.initBackButton();

        this.socket.emit('join_lobby', this.client_player_name);
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
        let name = this.game.add.text(namePosX, namePosY, player.name, {
            font: '14px ' + Assets.GoogleWebFonts.Roboto
        });
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
    }

    private initBlueTeamPanels(): void {
        let label = this.game.add.text(this.game.world.centerX, this.game.world.centerY, 'Team Blue', {
            font: '32px ' + Assets.GoogleWebFonts.Roboto
        });
        label.anchor.setTo(1.25, 4.0);

        let n: number = 0;
        // 3 rows
        for (let i = 0; i < Lobby.MAX_PLAYER_COUNT_PER_TEAM / 2; i++) {
            // 2 cols
            for (let j = 0; j < Lobby.MAX_PLAYER_COUNT_PER_TEAM / 3; j++) {
                let image = this.game.add.button(70 + 100 * (j + 1), 90 + 100 * (i + 1),
                                Assets.Atlases.ButtonsBlueSheet.getName(), this.bluePanelClick.bind(this, n),
                                this, Lobby.team_sheets[0], Lobby.team_sheets[0], Lobby.team_sheets[0], Lobby.team_sheets[0]);
                image.alpha = 0.9;
                this.blueTiles[n] = {'image': image, 'player': null};
                n++;
            }
        }
    }

    private initRedTeamPanels(): void {
        let label = this.game.add.text(this.game.world.centerX, this.game.world.centerY, 'Team Red', {
            font: '32px ' + Assets.GoogleWebFonts.Roboto
        });
        label.anchor.setTo(-0.32, 4.0);

        let n: number = 0;
        // 3 rows
        for (let i = 0; i < Lobby.MAX_PLAYER_COUNT_PER_TEAM / 2; i++) {
            // 2 cols
            for (let j = 0; j < Lobby.MAX_PLAYER_COUNT_PER_TEAM / 3; j++) {
                let image = this.game.add.button(300 + (100 * (j + 1)), 90 + 100 * (i + 1),
                                Assets.Atlases.ButtonsRedSheet.getName(), this.redPanelClick.bind(this, n),
                                this, Lobby.team_sheets[1], Lobby.team_sheets[1], Lobby.team_sheets[1], Lobby.team_sheets[1]);
                image.alpha = 0.9;
                this.redTiles[n] = {'image': image, 'player': null};
                n++;
            }
        }
    }

    private initReadyButton(): void {
        // pick the first button in the array to use as the asset
        let button: Phaser.Button = this.buttonUtil.createButton(this.game.world.centerX - 108, this.game.world.centerY + 248, this, this.readyOnClick);
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
        let button: Phaser.Button = this.buttonUtil.createButton(this.game.world.centerX + 108, this.game.world.centerY + 248, this, this.loadBack);
        let text: Phaser.Text = this.buttonUtil.createText(button.x, button.y, 'Back');
        this.back = new CustomButton(button, text);
        button.onInputOver.add(this.buttonUtil.over.bind(this, this.back), this);
        button.onInputOut.add(this.buttonUtil.out.bind(this, this.back), this);
    }

    private readyOnClick(): void {
        this.game.sound.play('click1');
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

    private bluePanelClick(tile: number): void {
        this.game.sound.play('click1');
        if (this.players[this.socket.id].isReady) return;
        if (this.blueTiles[tile].player !== null) return;
        this.socket.emit('blue_team_change', tile);
    }

    private redPanelClick(tile: number): void {
        this.game.sound.play('click1');        
        if (this.players[this.socket.id].isReady) return;
        if (this.redTiles[tile].player !== null) return;        
        this.socket.emit('red_team_change', tile);
    }

    /*
     * Goes back to the main menu
     */
    private loadBack(): void {
        this.socket.disconnect();
        this.unsubscribeAll();
        this.game.sound.play('click1');
        this.game.state.start('mainmenu', true, false);
    }

    private unsubscribeAll() {
        this.socket.off('lobby_start');
        this.socket.off('lobby_update');
        this.socket.off('lobby_player_left');
    }
}