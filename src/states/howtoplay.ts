import * as Assets from '../assets';
import CustomButton from './custombutton';
import MainMenu from './mainmenu';
import ButtonUtil from './buttonutil';

/*
 *  Welcome screen when user arrives at Fudge Wars website
 */
export default class HowToPlay extends Phaser.State {
    private background: Phaser.Image;

    // main menu buttons
    private back: CustomButton;

    // class used to create buttons
    private buttonUtil: ButtonUtil;

    public create(): void {
        this.background = this.game.add.image(0, 0, 'titlescreen');
        this.background.height = this.game.height;
        this.background.width = this.game.width;

        this.buttonUtil = new ButtonUtil(this.game);

        this.initInstructions();
        this.initBackButton();
    }

    private initInstructions(): void {
        let instructions: Phaser.Text = this.game.add.text(this.game.canvas.width / 2, this.game.canvas.height / 2 - 248, 'How to play', {
            font: '36px ' + Assets.GoogleWebFonts.Roboto,
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
        });
        instructions.anchor.setTo(0.5, 0.5);

        let wasd = this.game.add.image(this.game.canvas.width / 2, this.game.canvas.height / 2 - 128, 'wasd');
        wasd.anchor.setTo(1.5, 0.5);

        let label = 'W - Move up\nA - Move left\nS - Move down\nD - Move right';
        let text: Phaser.Text = this.buttonUtil.createText(this.game.canvas.width / 2, this.game.canvas.height / 2 - 128, label);
        text.anchor.setTo(0, 0.5);

        let mouse = this.game.add.image(this.game.canvas.width / 2, this.game.canvas.height / 2 + 8, 'mouse');
        mouse.anchor.setTo(1.5, 0.5);

        label = 'Left click - Hook\nRight click - Attack';
        let attackInstructions: Phaser.Text = this.buttonUtil.createText(this.game.canvas.width / 2, this.game.canvas.height / 2 + 8, label);
        attackInstructions.anchor.setTo(0, 0.5);

        let demoImage = this.game.add.image(this.game.canvas.width / 2, this.game.canvas.height / 2 + 138, 'demo');
        demoImage.anchor.setTo(0.5, 0.5);
        demoImage.scale.setTo(0.8);
    }

    /*
     * Creates start game button
     * Creates the start game text
     */
    private initBackButton(): void {
        // pick the first button in the array to use as the asset
        let button: Phaser.Button = this.buttonUtil.createButton(this.game.canvas.width / 2, this.game.canvas.height / 2 + 248, this, this.loadBack);
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
        this.game.state.start('mainmenu');
    }
}