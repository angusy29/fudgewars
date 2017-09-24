import * as Assets from '../assets';

/*
 * General blue button for menus
 * button: Button UI
 * text: Label inside the button
 */
export default class CustomButton {
    private button: Phaser.Button;
    private text: Phaser.Text;
    private isEnter: boolean;   // is button entered? used for playing hover sound

    static readonly TEXT_COLOR = '#FFFAFA';

    static buttons: any = [
        Assets.Atlases.ButtonsBlueSheet.Frames.BlueButton00,
        Assets.Atlases.ButtonsBlueSheet.Frames.BlueButton01,
        Assets.Atlases.ButtonsBlueSheet.Frames.BlueButton02,
        Assets.Atlases.ButtonsBlueSheet.Frames.BlueButton03,
        Assets.Atlases.ButtonsBlueSheet.Frames.BlueButton04,
        Assets.Atlases.ButtonsBlueSheet.Frames.BlueButton05,
        Assets.Atlases.ButtonsBlueSheet.Frames.BluePanel,
        Assets.Atlases.ButtonsRedSheet.Frames.RedPanel,
        Assets.Atlases.ButtonsGreenSheet.Frames.GreenBoxTick
    ];

    constructor(button: Phaser.Button, text: Phaser.Text) {
        this.button = button;
        this.text = text;
        this.isEnter = false;
    }

    public getButton(): Phaser.Button {
        return this.button;
    }

    public getText(): Phaser.Text {
        return this.text;
    }

    public setIsEnter(b: boolean) {
        this.isEnter = b;
    }

    public getIsEnter(): boolean {
        return this.isEnter;
    }
}