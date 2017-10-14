import * as Assets from '../assets';
import * as io from 'socket.io-client';
import CustomButton from './custombutton';
import ButtonUtil from './buttonutil';
import LobbyPlayer from './lobbyplayer';

/**
 * Lobby selection screen, where players can pick an existing lobby
 * or create their own lobby
 */
export default class LobbySelection extends Phaser.State {
    private background: Phaser.Image;
    private socket: any;

    private createLobbyButton: CustomButton;
    private backButton: CustomButton;

    // used to pass to game.ts
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
    }

    private registerSocketEvents(socket: any): void {
        // get number of lobbies

        // join lobby
    }

    /*
     * Creates create lobby button and corresponding text
     */
    private initCreateLobbyButton(): void {
        // pick the first button in the array to use as the asset
        let button: Phaser.Button = this.buttonUtil.createButton(this.game.canvas.width / 2 - 108, this.game.canvas.height / 2 + 248, this, this.createLobby);
        let text: Phaser.Text = this.buttonUtil.createText(button.x, button.y, 'Create Lobby');
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
        this.game.state.start('mainmenu', true, false, this.socket, this.client_player_name);
    }

    private unsubscribeAll() {
        this.socket.off('');
    }
}
