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
export default class LobbyCreation extends Phaser.State {
    private background: Phaser.Image;
    private socket: any;

    // form input fields
    static readonly INPUTFIELD_WIDTH = 400;
    private lobbyNameInput: PhaserInput.InputField;     // player names the lobby with this
    private gameLengthInput: PhaserInput.InputField;    // player changes the game length

    // game mode

    // map size
    static readonly SMALL = 0;
    static readonly MEDIUM = 1;
    static readonly LARGE = 2;
    private mapSizes: any= [ { id: LobbyCreation.SMALL, title: 'Small' },
                                { id: LobbyCreation.MEDIUM, title: 'Medium' },
                                { id: LobbyCreation.LARGE, title: 'Large' } ];
    private chosenMapSize: number;                      // 0 for small, 1 for medium, 2 for large

    // friendly fire
    private friendlyFireButton: Phaser.Button;          // player can turn on or off friendly fire
    private isFriendlyFire: boolean = false;                    // friendly fire on is true else false

    // buttons at bottom of page
    private createButton: CustomButton;
    private backButton: CustomButton;
    private roomExistText: Phaser.Text;

    // pass around client player name so it saves
    private client_player_name: string;

    // class used to create buttons
    private buttonUtil: ButtonUtil;

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

        // title which tells us what screen we are on
        let title: Phaser.Text = this.buttonUtil.createText(this.game.canvas.width / 2, this.game.canvas.height / 2 - 192, 'Create lobby', 48);
        title.anchor.setTo(0.5, 0.5);

        // create form
        this.lobbyNameInput = this.game.add['inputField']((this.game.canvas.width / 2) - (LobbyCreation.INPUTFIELD_WIDTH / 2), this.game.canvas.height / 2 - 100, {
            font: '24px Arial',
            width: LobbyCreation.INPUTFIELD_WIDTH,
            padding: 8,
            borderWidth: 1,
            borderColor: '#000',
            borderRadius: 4,
            placeHolder: 'Lobby name',
            fillAlpha: 0.9,
            max: 20,
            type: PhaserInput.InputType.text
        });

        // game length label and input
        let gameLengthLabel: Phaser.Text = this.buttonUtil.createText((this.game.canvas.width / 2) - 108, this.game.canvas.height / 2, 'Game length: ');
        this.gameLengthInput = this.game.add['inputField'](gameLengthLabel.x + (gameLengthLabel.width / 2), gameLengthLabel.y - 18, {
            font: '24px Arial',
            width: 200,
            padding: 8,
            borderWidth: 1,
            borderColor: '#000',
            borderRadius: 4,
            placeHolder: 'Minutes (60 max)',
            fillAlpha: 0.9,
            max: 60,
            type: PhaserInput.InputType.number
        });

        // game mode labels

        // map size labels
        let mapSizeLabel: Phaser.Text = this.buttonUtil.createText(gameLengthLabel.x, gameLengthLabel.y + 64, 'Map size: ');
        for (let i = 0; i < this.mapSizes.length; i++) {
            let label = this.buttonUtil.createText(mapSizeLabel.x + (128 * i) - 24, mapSizeLabel.y + 48, this.mapSizes[i].title, 18);

            // default to medium
            if (i === LobbyCreation.MEDIUM) {
                this.mapSizes[i].checkbox = this.game.add.button(label.x + (label.width / 2), label.y - 18, 'green_boxCheckmark',
                                                this.changeMapSize.bind(this, i), this);
                this.chosenMapSize = i;
            } else {
                this.mapSizes[i].checkbox = this.game.add.button(label.x + (label.width / 2), label.y - 18, 'grey_box',
                                                this.changeMapSize.bind(this, i), this);
            }
        }

        // friendly fire
        // NOT using atlases for friendlyFireButton because grey box isn't part of any atlas, so the green checkbox
        // is also just a png, like grey box
        let friendlyFireLabel: Phaser.Text = this.buttonUtil.createText(mapSizeLabel.x, mapSizeLabel.y + 96, 'Friendly fire: ');
        this.friendlyFireButton = this.game.add.button(friendlyFireLabel.x + (friendlyFireLabel.width / 2),
                                        friendlyFireLabel.y - 18, 'grey_box', this.setFriendlyFire, this);

        // if a room already exists of this name, then pop an error message
        this.roomExistText = this.buttonUtil.createText(this.game.canvas.width / 2, this.game.canvas.height / 2 + 192, 'Lobby with this name already exists!');
        this.roomExistText.anchor.setTo(0.5, 0.5);
        this.roomExistText.visible = false;

        this.initCreateButton();
        this.initBackButton();
    }

    private registerSocketEvents(socket: any): void {
        // get number of lobbies
        this.socket.on('room_already_exists', () => {
            this.roomExistText.visible = true;
        });
    }

    /*
     * Creates create lobby button and corresponding text
     */
    private initCreateButton(): void {
        // pick the first button in the array to use as the asset
        let button: Phaser.Button = this.buttonUtil.createButton(this.game.canvas.width / 2 - 108, this.game.canvas.height / 2 + 248, this, this.createLobby);
        let text: Phaser.Text = this.buttonUtil.createText(button.x, button.y, 'Create');
        this.createButton = new CustomButton(button, text);
        button.onInputOver.add(this.buttonUtil.over.bind(this, this.createButton), this);
        button.onInputOut.add(this.buttonUtil.out.bind(this, this.createButton), this);
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

    private createLobby(): void {
        this.game.sound.play('click1');
        this.socket.emit('room', {
            room: this.lobbyNameInput.value,
            isCreating: true,
            gameLength: this.gameLengthInput.value,
            mapSize: this.chosenMapSize,
            friendlyFire: this.isFriendlyFire,
        });

        // we need to check if this lobby already exists
        this.socket.on('room_join', () => {
            this.game.state.start('lobby', true, false, this.socket, this.client_player_name, this.lobbyNameInput.value);
        });
    }

    /*
     * Change map size
     * Rerenders map size options
     */
    private changeMapSize(index: number): void {
        for (let i = 0; i < this.mapSizes.length; i++) {
            let key = 'grey_box';
            if (i === index) key = 'green_boxCheckmark';
            this.mapSizes[i].checkbox.loadTexture(key);
        }
        this.chosenMapSize = index;
    }

    /*
     * Toggles isFriendlyFire
     * Rerenders the friendly fire checkbox
     * True means players can damage their own teammates
     * False means players cannot damage their own teammates
     */
    private setFriendlyFire(): void {
        this.isFriendlyFire = !this.isFriendlyFire;
        let key = 'grey_box';
        if (this.isFriendlyFire) key = 'green_boxCheckmark';
        this.friendlyFireButton.loadTexture(key);
    }

    /*
     * Goes back to the main menu
     */
    private loadBack(): void {
        this.socket.emit('lobby_selection_back');
        this.game.sound.play('click1');
        this.unsubscribeAll();
        this.game.state.start('lobbyselection', true, false, this.socket, this.client_player_name);
    }

    private unsubscribeAll() {
        this.socket.off('room_already_exists');
    }
}
