import * as Assets from '../assets';
import CustomButton from './custombutton';

/*
 * General functions to create buttons
 */
export default class ButtonUtil {
    private game: Phaser.Game;

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
}