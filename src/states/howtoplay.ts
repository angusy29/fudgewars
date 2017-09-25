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

        this.initBackButton();
    }

    /*
     * Creates start game button
     * Creates the start game text
     */
    private initBackButton(): void {
        // pick the first button in the array to use as the asset
        let button: Phaser.Button = this.buttonUtil.createButton(this.game.world.centerX, this.game.world.centerY + 192, this, this.loadBack);
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