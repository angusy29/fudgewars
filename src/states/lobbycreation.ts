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

    // form input fields
    private lobbyNameInput: PhaserInput.InputField;

    // buttons at bottom of page
    private createButton: CustomButton;
    private backButton: CustomButton;

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

        // create form
        this.lobbyNameInput = this.game.add['inputField'](this.game.canvas.width / 2 - 108, this.game.canvas.height / 2 - 92, {
            font: '24px Roboto',
            width: 300,
            padding: 8,
            borderWidth: 1,
            borderColor: '#000',
            borderRadius: 4,
            placeHolder: 'Lobby name',
            fillAlpha: 0.9,
            max: 20,
            type: PhaserInput.InputType.text
        });

        this.initCreateButton();
        this.initBackButton();
    }

    private registerSocketEvents(socket: any): void {
        // get number of lobbies

        // join lobby
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
        this.socket.emit('lobby_selection_create');
        this.game.sound.play('click1');
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
        this.socket.off('');
    }
}
