import * as Assets from '../assets';
import CustomButton from './custombutton';
import MainMenu from './mainmenu';
import ButtonUtil from './buttonutil';

/*
 *  Welcome screen when user arrives at Fudge Wars website
 */
export default class Options extends Phaser.State {
    private background: Phaser.Image;

    private currVolume: Phaser.Text;
    private upVolume: CustomButton;
    private downVolume: CustomButton;
    private back: CustomButton;

    // class used to create buttons
    private buttonUtil: ButtonUtil;

    public create(): void {
        this.background = this.game.add.image(0, 0, 'titlescreen');
        this.background.height = this.game.height;
        this.background.width = this.game.width;

        this.buttonUtil = new ButtonUtil(this.game);

        this.initSoundControl();
        this.initBackButton();
    }

    /*
     * Creates start game button
     * Creates the start game text
     */
    private initSoundControl(): void {
        let soundText: Phaser.Text = this.game.add.text(this.game.world.centerX, this.game.world.centerY - 56, 'Sound', {
            font: '24px ' + Assets.GoogleWebFonts.Roboto,
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
        });
        soundText.anchor.setTo(0.5, 0.5);

        let button: Phaser.Button = this.buttonUtil.createSoundButton(this.game.world.centerX - 56, this.game.world.centerY, this, this.decreaseVolume);
        let text: Phaser.Text = this.buttonUtil.createText(button.x, button.y, '-');
        this.downVolume = new CustomButton(button, text);
        button.onInputOver.add(this.buttonUtil.over.bind(this, this.downVolume), this);
        button.onInputOut.add(this.buttonUtil.out.bind(this, this.downVolume), this);

        let volume = this.getCurrVolume();
        this.currVolume = this.game.add.text(this.game.world.centerX, this.game.world.centerY, volume, {
            font: '24px ' + Assets.GoogleWebFonts.Roboto,
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
        });
        this.currVolume.anchor.setTo(0.5, 0.5);

        // pick the first button in the array to use as the asset
        button = this.buttonUtil.createSoundButton(this.game.world.centerX + 56, this.game.world.centerY, this, this.increaseVolume);
        text = this.buttonUtil.createText(button.x, button.y, '+');
        this.upVolume = new CustomButton(button, text);
        button.onInputOver.add(this.buttonUtil.over.bind(this, this.upVolume), this);
        button.onInputOut.add(this.buttonUtil.out.bind(this, this.upVolume), this);
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

    private getCurrVolume(): string {
        let vol = this.game.sound.volume * 10;
        return vol.toString(10);
    }

    private increaseVolume(): void {
        this.game.sound.volume += 0.1;
        this.game.sound.volume = Math.round( this.game.sound.volume * 10 ) / 10;
        this.currVolume.text = this.getCurrVolume();
    }

    private decreaseVolume(): void {
        this.game.sound.volume -= 0.1;
        this.game.sound.volume = Math.round( this.game.sound.volume * 10 ) / 10;
        this.currVolume.text = this.getCurrVolume();
    }

    /*
     * Goes back to the main menu
     */
    private loadBack(): void {
        this.game.sound.play('click1');
        this.game.state.start('mainmenu');
    }
}