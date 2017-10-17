import * as Assets from '../assets';
import CustomButton from './custombutton';
import MainMenu from './mainmenu';
import ButtonUtil from './buttonutil';

/*
 *  Welcome screen when user arrives at Fudge Wars website
 */
export default class Options extends Phaser.State {
    private background: Phaser.Image;

    private soundGroup: Phaser.Group;
    private currVolume: Phaser.Text;
    private upVolume: CustomButton;
    private downVolume: CustomButton;
    private back: CustomButton;

    // class used to create buttons
    private buttonUtil: ButtonUtil;

    private socket: any;
    private client_player_name: string;

    public init(socket: any, playername: string, ) {
        this.socket = socket;
        this.client_player_name = playername;
    }

    public create(): void {
        this.background = this.game.add.image(0, 0, 'titlescreen');
        this.background.height = this.game.height;
        this.background.width = this.game.width;

        this.buttonUtil = new ButtonUtil(this.game);

        let title: Phaser.Text = this.buttonUtil.createText(this.game.canvas.width / 2, this.game.canvas.height / 2 - 192, 'Options', 48);
        title.anchor.setTo(0.5, 0.5);

        this.soundGroup = this.game.add.group();

        this.soundGroup = this.buttonUtil.createSoundBar();
        this.initBackButton();

        this.game.world.sendToBack(this.background);
    }

    /*
     * Creates start game button
     * Creates the start game text
     */
    private initBackButton(): void {
        // pick the first button in the array to use as the asset
        let button: Phaser.Button = this.buttonUtil.createButton(this.game.canvas.width / 2, this.game.canvas.height / 2 + 192, this, this.loadBack);
        let text: Phaser.Text = this.buttonUtil.createText(button.x, button.y, 'Back');
        this.back = new CustomButton(button, text);
        button.onInputOver.add(this.buttonUtil.over.bind(this, this.back), this);
        button.onInputOut.add(this.buttonUtil.out.bind(this, this.back), this);
    }

    /*
     * Goes back to the main menu
     */
    private loadBack(): void {
        this.game.sound.play('click1');
        this.game.state.start('mainmenu', true, false, this.socket, this.client_player_name);
    }
}