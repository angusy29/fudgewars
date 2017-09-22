import * as Assets from '../assets';
import CustomButton from './custombutton';

/*
 *  Welcome screen when user arrives at Fudge Wars website
 */
export default class MainMenu extends Phaser.State {
    private background: Phaser.Image;

    // input field
    private nicknameInput: PhaserInput.InputField;

    // main menu buttons
    private allButtons: CustomButton[] = [];
    private startGame: CustomButton;
    private howToPlay: CustomButton;
    private options: CustomButton;

    private static buttons: any = [
        Assets.Atlases.ButtonsBlueSheet.Frames.BlueButton00,
        Assets.Atlases.ButtonsBlueSheet.Frames.BlueButton01,
        Assets.Atlases.ButtonsBlueSheet.Frames.BlueButton02,
        Assets.Atlases.ButtonsBlueSheet.Frames.BlueButton03,
        Assets.Atlases.ButtonsBlueSheet.Frames.BlueButton04,
        Assets.Atlases.ButtonsBlueSheet.Frames.BlueButton05
    ];

    static readonly TEXT_COLOR: string = '#FFFAFA';

    public preload(): void {
        // Load any assets you need for your preloader state here.
        this.game.plugins.add(PhaserInput.Plugin);
    }

    public create(): void {
        this.background = this.game.add.image(0, 0, 'titlescreen');
        this.background.height = this.game.height;
        this.background.width = this.game.width;

        // using ['inputField'] is shit style, if anyone knows how to properly set up plugins please fix
        // this is using PhaserInput plugin, phaser doesn't have build in inputFields, have to use plugin
        // can't use anchor.setTo, because placeholder and input text isn't anchored
        this.nicknameInput = this.game.add['inputField'](this.game.world.centerX - 108, this.game.world.centerY - 92, {
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
        let button: Phaser.Button = this.createButton(this.game.world.centerX, this.game.world.centerY, this.loadGame);
        let text: Phaser.Text = this.createText(button.x, button.y, 'Play online');
        this.startGame = new CustomButton(button, text);
        button.onInputOver.add(this.over.bind(this, this.startGame), this);
        button.onInputOut.add(this.out.bind(this, this.startGame), this);
        this.allButtons.push(this.startGame);
    }

    /*
     * Creates how to play button
     * Creates the how to play text
     */
    private initHowToPlayButton(): void {
        let button: Phaser.Button = this.createButton(this.startGame.getButton().x, this.startGame.getButton().y + 64, this.loadHowToPlay);
        let text: Phaser.Text = this.createText(button.x, button.y, 'How to play');
        this.howToPlay = new CustomButton(button, text);
        button.onInputOver.add(this.over.bind(this, this.howToPlay), this);
        button.onInputOut.add(this.out.bind(this, this.howToPlay), this);
        this.allButtons.push(this.howToPlay);
    }

    /*
     * Creates options button
     * Creates the option text
     */
    private initOptionsButton(): void {
        let button = this.createButton(this.howToPlay.getButton().x, this.howToPlay.getButton().y + 64, this.loadOptions);
        let text: Phaser.Text = this.createText(button.x, button.y, 'Options');
        this.options = new CustomButton(button, text);
        button.onInputOver.add(this.over.bind(this, this.options), this);
        button.onInputOut.add(this.out.bind(this, this.options), this);
        this.allButtons.push(this.options);
    }

    /*
     * x: x coordinate to draw button
     * y: y coordinate to draw button
     * callback: Function to be called when this button is pressed
     * return: A button positioned at x, y
     */
    private createButton(x, y, callback): Phaser.Button {
        let button: Phaser.Button = this.game.add.button(x, y,
            Assets.Atlases.ButtonsBlueSheet.getName(), callback,
            this, MainMenu.buttons[0], MainMenu.buttons[1], MainMenu.buttons[2], MainMenu.buttons[3]);
        button.alpha = 0.9;
        button.anchor.setTo(0.5, 0.5);
        return button;
    }

    /*
     * x: x coordinate to draw text
     * y: y coordinate to draw text
     * label: string to label this Phaser.Text
     * return: A label positioned at x, y with string label
     */
    private createText(x, y, label): Phaser.Text {
        let text = this.game.add.text(x, y, label, {
            font: '24px ' + Assets.GoogleWebFonts.Roboto
        });
        text.addColor(MainMenu.TEXT_COLOR, 0);
        text.anchor.setTo(0.5, 0.4);
        return text;
    }

    /*
     * Callback function for when startGame is pressed
     */
    private loadGame(): void {
        this.game.sound.play('click1');
        this.game.state.start('game', true, false, this.nicknameInput.value);
    }

    private loadHowToPlay(): void {
        // TODO
        this.game.sound.play('click1');
    }

    private loadOptions(): void {
        this.game.sound.play('click1');
        // TODO
    }

    /*
     * Callback for on hover
     */
    private over(item: CustomButton): void {
        if (item.getIsEnter()) return;
        item.setIsEnter(true);
        item.getText().anchor.setTo(0.5, 0.5);
        this.game.sound.play('rollover1');
    }

    /*
     * Callback for leaving a button
     */
    private out(item: CustomButton): void {
        item.setIsEnter(false);
        item.getText().anchor.setTo(0.5, 0.4);
    }
}