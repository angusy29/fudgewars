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

    private createLobbyButton: CustomButton;
    private backButton: CustomButton;

    // used to pass to game.ts
    private client_player_name: string;

    // class used to create buttons
    private buttonUtil: ButtonUtil;

    private lobbyFullText: Phaser.Text;

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

        this.initLobbies();
        this.initCreateLobbyButton();
        this.initBackButton();
    }

    private registerSocketEvents(socket: any): void {
        // get number of lobbies

        // join lobby
    }

    private initLobbies(): void {
        let boundsWidth: number = 500;
        let boundsHeight: number = 400;
        let bounds = new Phaser.Rectangle(this.game.world.centerX - (boundsWidth / 2), this.game.world.centerY - (boundsHeight / 2), boundsWidth, boundsHeight);
        let options = { direction: 'y', overflow: 100, padding: 10, searchForClicks: true };

        let listView = new ListView(this.game, this.game.world, bounds, options);

        let boxW: number = 500;
        let boxH: number = 100;

        // let's just create 5 lobbies for now (client side dictating how many lobbies there are)
        // eventually we'll have to create a lobby
        // tell the server we created a lobby
        // server keeps track of all the lobbies, and tells client to render X number of lobbies
        for (let i = 0; i < 5; i++) {
            let color = Phaser.Color.getRandomColor();
            let group = this.game.make.group(null);
            let g = this.game.add.graphics(0, 0, group);
            g.beginFill(color).drawRect(0, 0, boxW, boxH);

            let txt = this.game.add.text(boxW / 2, boxH / 2, 'NewtonRoom-' + i, { font: '40px Arial', fill: '#000' }, group);
            txt.anchor.set(.5);
            let img = this.game.add.image(0, 0, group.generateTexture());
            img.inputEnabled = true;
            img.events.onInputUp.add(this.joinLobby.bind(this, 'NewtonRoom-' + i), this);
            listView.add(img);
        }
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

    private joinLobby(room: string, context: any): void {
        // "create" this room, server will just let player join if it exists and not create the room
        this.socket.emit('room', room);
        this.socket.once('room_created', (data: any) => {
            if (!data.joinable) {
                if (this.lobbyFullText) this.lobbyFullText.destroy();
                this.lobbyFullText = this.game.add.text(this.game.world.centerX, 100, room + ' is full!', { font: '24px Arial', fill: '#ff0000' });
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
        this.socket.off('');
    }
}
