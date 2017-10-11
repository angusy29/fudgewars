import * as Assets from '../assets';
import CustomButton from './custombutton';
import ButtonUtil from './buttonutil';
import * as io from 'socket.io-client';

/*
 *  Welcome screen when user arrives at Fudge Wars website
 */
export default class MainMenu extends Phaser.State {
    private socket: any;
    private background: Phaser.Image;
    private client_player_name: string;

    // input field
    private nicknameInput: PhaserInput.InputField;

    // main menu buttons
    private allButtons: CustomButton[] = [];
    private startGame: CustomButton;
    private howToPlay: CustomButton;
    private options: CustomButton;

    // class used to create buttons
    private buttonUtil: ButtonUtil;

    public preload(): void {
        // Load any assets you need for your preloader state here.
        this.game.plugins.add(PhaserInput.Plugin);
    }

    public init(playername: string, socket: any): void {
        this.socket = socket;
        this.client_player_name = playername;
    }

    public create(): void {
        this.buttonUtil = new ButtonUtil(this.game);

        this.background = this.game.add.image(0, 0, 'titlescreen');
        this.background.height = this.game.height;
        this.background.width = this.game.width;

        // using ['inputField'] is shit style, if anyone knows how to properly set up plugins please fix
        // this is using PhaserInput plugin, phaser doesn't have build in inputFields, have to use plugin
        // can't use anchor.setTo, because placeholder and input text isn't anchored
        this.nicknameInput = this.game.add['inputField'](this.game.canvas.width / 2 - 108, this.game.canvas.height / 2 - 92, {
            font: '24px Roboto',
            width: 200,
            padding: 8,
            borderWidth: 1,
            borderColor: '#000',
            borderRadius: 4,
            placeHolder: 'Nickname',
            fillAlpha: 0.9,
            max: 15,
            type: PhaserInput.InputType.text
        });

        this.nicknameInput.setText(this.client_player_name);

        // must be called in this order
        // as subsequent buttons depend on previous button position
        this.initStartGameButton();
        this.initHowToPlayButton();
        this.initOptionsButton();
    }

    /*
     * Creates start game button
     * Creates the start game text
     */
    private initStartGameButton(): void {
        // pick the first button in the array to use as the asset
        let button: Phaser.Button = this.buttonUtil.createButton(this.game.canvas.width / 2, this.game.canvas.height / 2, this, this.loadGame);
        let text: Phaser.Text = this.buttonUtil.createText(button.x, button.y, 'Play online');
        this.startGame = new CustomButton(button, text);
        button.fixedToCamera = true;
        text.fixedToCamera = true;
        button.onInputOver.add(this.buttonUtil.over.bind(this, this.startGame), this);
        button.onInputOut.add(this.buttonUtil.out.bind(this, this.startGame), this);
        this.allButtons.push(this.startGame);
    }

    /*
     * Creates how to play button
     * Creates the how to play text
     */
    private initHowToPlayButton(): void {
        let button: Phaser.Button = this.buttonUtil.createButton(this.startGame.getButton().x, this.startGame.getButton().y + 64, this, this.loadHowToPlay);
        let text: Phaser.Text = this.buttonUtil.createText(button.x, button.y, 'How to play');
        this.howToPlay = new CustomButton(button, text);
        button.onInputOver.add(this.buttonUtil.over.bind(this, this.howToPlay), this);
        button.onInputOut.add(this.buttonUtil.out.bind(this, this.howToPlay), this);
        this.allButtons.push(this.howToPlay);
    }

    /*
     * Creates options button
     * Creates the option text
     */
    private initOptionsButton(): void {
        let button = this.buttonUtil.createButton(this.howToPlay.getButton().x, this.howToPlay.getButton().y + 64, this, this.loadOptions);
        let text: Phaser.Text = this.buttonUtil.createText(button.x, button.y, 'Options');
        this.options = new CustomButton(button, text);
        button.onInputOver.add(this.buttonUtil.over.bind(this, this.options), this);
        button.onInputOut.add(this.buttonUtil.out.bind(this, this.options), this);
        this.allButtons.push(this.options);
    }

    /*
     * Callback function for when startGame is pressed
     */
    private loadGame(): void {
        this.game.sound.play('click1');
        this.game.state.start('lobby', true, false, this.nicknameInput.value, this.socket);
    }

    /*
     * Callback function to look at instructions
     */
    private loadHowToPlay(): void {
        this.game.sound.play('click1');
        this.game.state.start('howtoplay', true, false, this.nicknameInput.value, this.socket);
    }

    private loadOptions(): void {
        this.game.sound.play('click1');
        this.game.state.start('options', true, false, this.nicknameInput.value, this.socket);
    }
}