import * as Assets from '../assets';
import CustomButton from './custombutton';

/*
 * General functions to create buttons
 */
export default class ButtonUtil {
    private game: Phaser.Game;

    static readonly SOUNDBAR_LENGTH = 200;
    static readonly SOUNDBAR_HEIGHT = 25;
    static readonly SOUNDBAR_MIN = 298;     // hardcoded
    static readonly SOUNDBAR_MAX = 470;     // hardcoded

    constructor(game: Phaser.Game) {
        this.game = game;
    }

    /*
     * x: x coordinate to draw button
     * y: y coordinate to draw button
     * callback: Function to be called when this button is pressed
     * return: A button positioned at x, y
     */
    public createButton(x, y, context, callback): Phaser.Button {
        let button: Phaser.Button = this.game.add.button(x, y,
            Assets.Atlases.ButtonsBlueSheet.getName(), callback,
            context, CustomButton.buttons[0], CustomButton.buttons[1], CustomButton.buttons[2], CustomButton.buttons[3]);
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
    public createText(x, y, label): Phaser.Text {
        let text = this.game.add.text(x, y, label, {
            font: '24px ' + Assets.GoogleWebFonts.Roboto,
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        });
        text.addColor(CustomButton.TEXT_COLOR, 0);
        text.anchor.setTo(0.5, 0.4);
        return text;
    }

    public createSoundButton(x, y, context, callback): Phaser.Button {
        let button: Phaser.Button = this.game.add.button(x, y,
            Assets.Atlases.ButtonsBlueSheet.getName(), callback,
            context, CustomButton.soundButtons[1], CustomButton.soundButtons[2], CustomButton.soundButtons[0], CustomButton.soundButtons[1]);
        button.alpha = 0.9;
        button.anchor.setTo(0.5, 0.5);
        return button;
    }

    public createSoundBar(): Phaser.Group {
        let soundText: Phaser.Text = this.game.add.text(this.game.canvas.width / 2, this.game.canvas.height / 2 - 56, 'Sound', {
            font: '24px ' + Assets.GoogleWebFonts.Roboto,
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
        });
        soundText.anchor.setTo(0.5, 0.5);

        // create health bar canvas
        let soundBMP = this.game.add.bitmapData(ButtonUtil.SOUNDBAR_LENGTH, ButtonUtil.SOUNDBAR_HEIGHT);
        soundBMP.ctx.beginPath();
        soundBMP.ctx.rect(0, 0, ButtonUtil.SOUNDBAR_LENGTH, ButtonUtil.SOUNDBAR_HEIGHT);
        soundBMP.ctx.fillStyle = '#2554C7';
        soundBMP.ctx.fillRect(0, 0, ButtonUtil.SOUNDBAR_LENGTH, ButtonUtil.SOUNDBAR_HEIGHT);

        let soundBgBMP = this.game.add.bitmapData(ButtonUtil.SOUNDBAR_LENGTH, ButtonUtil.SOUNDBAR_HEIGHT);
        soundBgBMP.ctx.beginPath();
        soundBgBMP.ctx.rect(0, 0, ButtonUtil.SOUNDBAR_LENGTH, ButtonUtil.SOUNDBAR_HEIGHT);
        soundBgBMP.ctx.fillStyle = '#2554C7'
        soundBgBMP.ctx.fillRect(0, 0, ButtonUtil.SOUNDBAR_LENGTH, ButtonUtil.SOUNDBAR_HEIGHT);

        // sound bar foreground
        let soundBarFg = this.game.add.sprite(this.game.canvas.width / 2, this.game.canvas.height / 2 - 8, soundBMP);
        soundBarFg.anchor.setTo(0.5, 0.5);
        
        // sound bar background
        let soundBarBg = this.game.add.sprite(this.game.canvas.width / 2, this.game.canvas.height / 2 - 8, soundBgBMP);
        soundBarBg.anchor.setTo(0.5, 0.5);

        let soundSlider = this.game.add.sprite(0, soundBarFg.y - 6.5, Assets.Atlases.ButtonsBlueSheet.getName(), CustomButton.soundButtons[3]);
        soundSlider.anchor.setTo(0.5, 0.5);
        soundSlider.inputEnabled = true;
        soundSlider.input.enableDrag(false, true, false, 255, null, soundBarBg);
        soundSlider.events.onDragUpdate.add(this.onDragUpdate, this);
        soundSlider.bringToTop();

        // child 0 is the foreground, child 1 is background
        // child 2 is the slider
        let soundBar = new Phaser.Group(this.game);
        soundBar.addAt(soundText, 0);
        soundBar.addAt(soundBarFg, 1);
        soundBar.addAt(soundBarBg, 2);
        soundBar.addAt(soundSlider, 3);

        soundBar.fixedToCamera = true;

        // calculate sprite position by rearranging normalization formula
        soundSlider.x = this.game.sound.volume * (ButtonUtil.SOUNDBAR_MAX - ButtonUtil.SOUNDBAR_MIN) + ButtonUtil.SOUNDBAR_MIN;

        return soundBar;
    }

    /*
     * Callback for on hover
     */
    public over(item: CustomButton): void {
        if (item.getIsEnter()) return;
        item.setIsEnter(true);
        item.getText().anchor.setTo(0.5, 0.5);
        this.game.sound.play('rollover1');
    }

    /*
     * Callback for leaving a button
     */
    public out(item: CustomButton): void {
        item.setIsEnter(false);
        item.getText().anchor.setTo(0.5, 0.4);
    }
    
    private onDragUpdate(sprite: Phaser.Sprite, pointer: Phaser.Pointer): void {
        let normalizedVolume = (sprite.x - ButtonUtil.SOUNDBAR_MIN) / (ButtonUtil.SOUNDBAR_MAX - ButtonUtil.SOUNDBAR_MIN);
        this.game.sound.volume = normalizedVolume;
        sprite.y = sprite.y - 15;
    }
}