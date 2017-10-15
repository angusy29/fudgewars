import * as Assets from '../assets';
import * as io from 'socket.io-client';
import CustomButton from './custombutton';
import ButtonUtil from './buttonutil';
import LobbyPlayer from './lobbyplayer';
import { ListView } from 'phaser-list-view';

/**
 * Lobby selection screen, where players can pick an existing lobby
 * or create their own lobby
 */
export default class LobbySelection extends Phaser.State {
    private background: Phaser.Image;
    private socket: any;

    // buttons
    private refreshListButton: CustomButton;
    private createLobbyButton: CustomButton;
    private backButton: CustomButton;

    // used to pass to game.ts
    private client_player_name: string;

    // class used to create buttons
    private buttonUtil: ButtonUtil;

    private numLobbyText: Phaser.Text;      // displays the number of lobbies in the game
    private noLobbyText: Phaser.Text;       // displays when there are no lobbies
    private lobbyFullText: Phaser.Text;     // displays if lobby is full

    static readonly BOUND_WIDTH = 500;
    static readonly BOUND_HEIGHT = 380;

    public init(socket: any, playername: string): void {
        this.socket = socket;
        this.client_player_name = playername;

        /* Initialise socket and set up listeners */
        this.socket = socket;
        this.registerSocketEvents(socket);
    }

    public create(): void {
        this.buttonUtil = new ButtonUtil(this.game);

        this.background = this.game.add.image(0, 0, 'titlescreen');
        this.background.height = this.game.height;
        this.background.width = this.game.width;

        let title: Phaser.Text = this.game.add.text(this.game.canvas.width / 2, this.game.canvas.height / 2 - 248, 'Select a lobby', {
            font: '48px ' + Assets.GoogleWebFonts.Roboto,
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
        });
        title.anchor.setTo(0.5, 0.5);

        this.noLobbyText = this.game.add.text(this.game.canvas.width / 2, this.game.canvas.height / 2, 'There are currently no lobbies.', {
            font: '36px ' + Assets.GoogleWebFonts.Roboto,
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
        });
        this.noLobbyText.anchor.setTo(0.5, 0.5);
        this.noLobbyText.visible = false;

        this.initRefreshListButton();
        this.initLobbies();
        this.initCreateLobbyButton();
        this.initBackButton();
    }

    private registerSocketEvents(socket: any): void {
        // get number of lobbies

        // join lobby
    }

    private initRefreshListButton(): void {
        // -49, because 49 is width of the refresh button
        let button: Phaser.Button = this.game.add.button((this.game.canvas.width / 2) + (LobbySelection.BOUND_WIDTH / 2) - 49, (this.game.canvas.height / 2) - (LobbySelection.BOUND_HEIGHT / 2) - 50,
                                        Assets.Atlases.ButtonsBlueSheet.getName(), this.refreshLobbyList, this,
                                        CustomButton.iconButton[1], CustomButton.iconButton[2], CustomButton.iconButton[0], CustomButton.iconButton[1]);
        let icon: Phaser.Sprite = this.game.add.sprite(button.x - 1, button.y - 5, Assets.Atlases.ButtonsSheetWhite2x.getName(), CustomButton.icons[0]);
        icon.scale.setTo(0.5, 0.5);
        icon.bringToTop();
    }

    private initLobbies(): void {
        let bounds = new Phaser.Rectangle((this.game.canvas.width / 2) - (LobbySelection.BOUND_WIDTH / 2), (this.game.canvas.height / 2) - (LobbySelection.BOUND_HEIGHT / 2),
                                            LobbySelection.BOUND_WIDTH, LobbySelection.BOUND_HEIGHT);
        let options = { direction: 'y', overflow: 100, padding: 10, searchForClicks: true };

        let listView = new ListView(this.game, this.game.world, bounds, options);

        let boxW: number = 500;
        let boxH: number = 120;

        this.refreshLobbyList();

        this.socket.on('lobby_selection_update', (allRooms: any) => {
            listView.removeAll();

            let numLobbies: number = Object.keys(allRooms).length;
            if (numLobbies === 0) {
                this.noLobbyText.visible = true;
                return;
            }

            this.noLobbyText.visible = false;
            for (let room in allRooms) {
                let group = this.game.make.group(null);
                let button: Phaser.Button = this.game.add.button(0, 0, 'room', null, null, null, null, null, null, group);
                button.alpha = 0.9;
                button.width = boxW;
                button.height = boxH;

                let roomName = this.game.add.text(button.x + 14, button.y + 10, room, {
                    font: '24px ' + Assets.GoogleWebFonts.Roboto,
                    fill: '#ffffff',
                    stroke: '#000000',
                    strokeThickness: 3,
                }, group);

                let roomCapacity = this.game.add.text(roomName.x, roomName.y + 32, allRooms[room].playerCount + ' / 12 players', {
                    font: '16px ' + Assets.GoogleWebFonts.Roboto,
                    fill: '#ffffff',
                    stroke: '#000000',
                    strokeThickness: 3,
                }, group);

                let progressText = allRooms[room].isPlaying === true ? 'In progress' : 'In lobby';
                let roomProgress = this.game.add.text(roomCapacity.x, roomCapacity.y + 42, progressText, {
                    font: '16px ' + Assets.GoogleWebFonts.Roboto,
                    fill: '#ffffff',
                    stroke: '#000000',
                    strokeThickness: 3,
                }, group);

                let spriteX = 200;
                for (let i = 0; i < allRooms[room].blueCount; i++) {
                    this.createSprite(spriteX + (40 * (i + 1)), roomName.y + 4, 'Blue', group);
                }

                for (let i = 0; i < allRooms[room].redCount; i++) {
                    this.createSprite(spriteX + (40 * (i + 1)), roomName.y + 38, 'Red', group);
                }

                let img = this.game.add.image(0, 0, group.generateTexture());
                img.inputEnabled = true;
                img.events.onInputUp.add(this.joinLobby.bind(this, room), this);

                listView.add(img);
            }

            if (this.numLobbyText) delete this.numLobbyText;
            let numText = numLobbies === 1 ? numLobbies + ' lobby' : numLobbies + ' lobbies';
            this.numLobbyText = this.game.add.text(bounds.x, bounds.y - 40, numText, {
                font: '24px ' + Assets.GoogleWebFonts.Roboto,
                fill: '#fff',
                stroke: '#000',
                strokeThickness: 3
            });
        });
    }

    private createSprite(x: number, y: number, team: string, group: Phaser.Group): Phaser.Sprite {
        let frame;
        if (team === 'Blue') frame = 'p2_walk';
        if (team === 'Red') frame = 'p3_walk';

        // set up sprite
        let sprite = this.game.add.sprite(x, y, frame, null, group);
        sprite.scale.setTo(0.5);

        return sprite;
    }

    /*
     * Creates create lobby button and corresponding text
     */
    private initCreateLobbyButton(): void {
        // pick the first button in the array to use as the asset
        let button: Phaser.Button = this.buttonUtil.createButton(this.game.canvas.width / 2 - 108, this.game.canvas.height / 2 + 248, this, this.createLobby);
        let text: Phaser.Text = this.buttonUtil.createText(button.x, button.y, 'Create lobby');
        this.createLobbyButton = new CustomButton(button, text);
        button.onInputOver.add(this.buttonUtil.over.bind(this, this.createLobbyButton), this);
        button.onInputOut.add(this.buttonUtil.out.bind(this, this.createLobbyButton), this);
    }

    /*
     * Creates back button and corresponding text
     */
    private initBackButton(): void {
        // pick the first button in the array to use as the asset
        let button: Phaser.Button = this.buttonUtil.createButton(this.game.canvas.width / 2 + 108, this.game.canvas.height / 2 + 248, this, this.loadBack);
        let text: Phaser.Text = this.buttonUtil.createText(button.x, button.y, 'Back');
        this.backButton = new CustomButton(button, text);
        button.onInputOver.add(this.buttonUtil.over.bind(this, this.backButton), this);
        button.onInputOut.add(this.buttonUtil.out.bind(this, this.backButton), this);
    }

    private refreshLobbyList(): void {
        this.socket.emit('get_lobbies');        
    }

    private joinLobby(room: string, context: any): void {
        // "create" this room, server will just let player join if it exists and not create the room
        this.socket.emit('room', { 'room': room, 'isCreating': false });
        this.socket.once('room_join', (data: any) => {
            if (!data.joinable) {
                if (this.lobbyFullText) this.lobbyFullText.destroy();
                this.lobbyFullText = this.game.add.text(this.game.world.centerX, this.game.world.centerY + 208, room + ' is full!', { font: '24px Arial', fill: '#ff0000' });
                this.lobbyFullText.anchor.setTo(0.5);
            } else {
                this.game.state.start('lobby', true, false, this.socket, this.client_player_name, room);
            }
        });
    }

    private createLobby(): void {
        this.game.sound.play('click1');
        this.unsubscribeAll();
        this.game.state.start('lobbycreation', true, false, this.socket, this.client_player_name);
    }

    /*
     * Goes back to the main menu
     */
    private loadBack(): void {
        this.socket.emit('lobby_selection_back');
        this.game.sound.play('click1');
        this.unsubscribeAll();
        this.game.state.start('mainmenu', true, false, this.socket, this.client_player_name);
    }

    private unsubscribeAll() {
        this.socket.off('lobby_selection_update');
    }
}
