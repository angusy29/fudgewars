import * as Assets from '../assets';
import CustomButton from './custombutton';

/*
 *  Welcome screen when user arrives at Fudge Wars website
 */
export default class MainMenu extends Phaser.State {
    private background: Phaser.Image;

    // main menu buttons and text
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
    }

    public create(): void {
        this.background = this.game.add.image(0, 0, 'titlescreen');

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
        button.onInputOver.add(this.over, this);
        button.onInputOut.add(this.out, this);
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
        this.game.state.start('game');
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
    private over(): void {
        this.allButtons.forEach(function(item) {
            if (item.getButton().input.pointerOver()) {
                if (item.getIsEnter()) return;
                item.setIsEnter(true);
                item.getText().anchor.setTo(0.5, 0.5);
                this.game.sound.play('rollover1');
            }
        }, this);
    }

    /*
     * Callback for leaving a button
     */
    private out(): void {
        this.allButtons.forEach(function(item) {
            if (!item.getButton().input.pointerOver()) {
                item.setIsEnter(false);
                item.getText().anchor.setTo(0.5, 0.4);
            }
        }, this);
    }
}