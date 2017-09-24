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
    private blue: any = {};
    private red: any = {};

    // these group all the tiles on the GUI
    private blueTiles: any = {};
    private redTiles: any = {};

    // buttons at bottom of page
    private ready: CustomButton;
    private back: CustomButton;

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
        Assets.Atlases.ButtonsGreenSheet.Frames.GreenBoxTick
    ];

    public init(playername: string): void {
        this.client_player_name = playername;
        this.players = {};  // need to reset these, otherwise
        this.blue = {};     // state persists, if we go back
        this.red = {};
        this.blueTiles = {};
        this.redTiles = {};

        this.socket = io.connect();

        this.socket.on('lobby_update', (data: any) => {
            for (let player of data) {
                if (!this.players[player.id]) {
                    this.addNewPlayer(player);
                }
            }
        });

        // start the game because everyone is ready
        this.socket.on('lobby_start', () => {
            this.socket.off('lobby_update');
            this.socket.off('lobby_player_left');
            this.socket.emit('prepare_world');
        });

        this.socket.on('start_game', () => {
            this.game.state.start('game', true, false, this.client_player_name, this.socket);
        });

        this.socket.on('lobby_player_left', (id: any) => {
            this.players[id].name.destroy();

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
        let posX = 0;
        let posY = 0;
        let tile = 0;

        if (player.team === Lobby.BLUE) {
            // add to blue team
            for (let i = 0; i < Lobby.MAX_PLAYER_COUNT_PER_TEAM; i++) {
                if (!this.blueTiles[i].player) {
                    posX = this.blueTiles[i].image.centerX;
                    posY = this.blueTiles[i].image.centerY - Lobby.PLAYER_NAME_Y_OFFSET;
                    tile = i;
                    break;
                }
            }
        } else {
            // add to red team
            for (let i = 0; i < Lobby.MAX_PLAYER_COUNT_PER_TEAM; i++) {
                if (!this.redTiles[i].player) {
                    posX = this.redTiles[i].image.centerX;
                    posY = this.redTiles[i].image.centerY - Lobby.PLAYER_NAME_Y_OFFSET;
                    tile = i;
                    break;
                }
            }
        }

        // set up label of the player
        let name = this.game.add.text(posX, posY, player.name, {
            font: '14px ' + Assets.GoogleWebFonts.Roboto
        });
        name.anchor.setTo(0.5, 0.5);

        this.players[player.id] = new LobbyPlayer(player.id, name, player.team, tile,  null);

        // tell blueTiles or redTiles that someone is on that tile now
        if (player.team === Lobby.BLUE) {
            this.blueTiles[tile].player = this.players[player.id];
        }

        if (player.team === Lobby.RED) {
            this.redTiles[tile].player = this.players[player.id];
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
                let image = this.game.add.image(70 + 100 * (j + 1), 90 + 100 * (i + 1),
                                Assets.Atlases.ButtonsBlueSheet.getName(), Lobby.team_sheets[0]);
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
                let image = this.game.add.image(300 + (100 * (j + 1)), 90 + 100 * (i + 1),
                                Assets.Atlases.ButtonsRedSheet.getName(), Lobby.team_sheets[1]);
                image.alpha = 0.9;
                this.redTiles[n] = {'image': image, 'player': null};
                n++;
            }
        }
    }

    private initReadyButton(): void {
        // pick the first button in the array to use as the asset
        let button: Phaser.Button = this.buttonUtil.createButton(this.game.world.centerX - 108, this.game.world.centerY + 248, this, this.loadReady);
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

    private loadReady(): void {
        this.game.sound.play('click1');
        this.players[this.socket.id].isReady = !this.players[this.socket.id].isReady;
        this.socket.emit('player_ready', this.socket.id);
    }

    /*
     * Goes back to the main menu
     */
    private loadBack(): void {
        this.socket.disconnect();
        this.socket.off('lobby_update');
        this.socket.off('lobby_player_left');
        this.game.sound.play('click1');
        this.game.state.start('mainmenu', true, false);
    }
}