import { NumberUtils } from '../utils/utils';
import { Atlases } from '../assets';
import Game from './game';

export default class Flag {
    game: Game;
    id: number;
    sprite: Phaser.Sprite = null;
    timeText: Phaser.Text;
    isFlagUp: boolean = false;
    returnTime: number;

    private static colors: any = [
        [
            Atlases.SpritesheetsItemsSpritesheet.Frames.FlagBlue,
            Atlases.SpritesheetsItemsSpritesheet.Frames.FlagBlue2
        ],
        [
            Atlases.SpritesheetsItemsSpritesheet.Frames.FlagRed,
            Atlases.SpritesheetsItemsSpritesheet.Frames.FlagRed2,
        ],
        [
            Atlases.SpritesheetsItemsSpritesheet.Frames.FlagGreen,
            Atlases.SpritesheetsItemsSpritesheet.Frames.FlagGreen2,
        ],
        [
            Atlases.SpritesheetsItemsSpritesheet.Frames.FlagYellow,
            Atlases.SpritesheetsItemsSpritesheet.Frames.FlagYellow2,
        ]
    ];

    private static flagDownColors: any = [
        Atlases.SpritesheetsItemsSpritesheet.Frames.FlagBlueHanging,
        Atlases.SpritesheetsItemsSpritesheet.Frames.FlagRedHanging,
        Atlases.SpritesheetsItemsSpritesheet.Frames.FlagGreenHanging,
        Atlases.SpritesheetsItemsSpritesheet.Frames.FlagYellowHanging,
    ];

    constructor(game: Game, x: number, y: number, colorIdx: number, captured: boolean) {
        this.game = game;
        this.id = colorIdx;
        this.sprite = game.add.sprite(x, y, Atlases.SpritesheetsItemsSpritesheet.getName() , Flag.colors[colorIdx][0]);
        this.sprite.anchor.setTo(0, 1); // reset the anchor to the center of the flag pole
        this.sprite.scale.setTo(0.6, 0.6); // scale down the flag
        this.sprite.animations.add('flag_up', Flag.colors[colorIdx], 5, true, false);
        this.sprite.animations.add('flag_down', [Flag.flagDownColors[colorIdx]], 5, true, false);

        this.timeText = game.add.text(x, y, 'hello', {
            font: '14px Arial',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
        });
        this.timeText.visible = false;

        if (captured) {
            this.setFlagDown();
        } else {
            this.setFlagUp(); // flag up
        }
    }

    public update(update: any): void {
        this.returnTime = update.returnTime;
        this.sprite.x = update.x;
        this.sprite.y = update.y;
        if (update.carriedBy) {
            this.setFlagDown();
            this.timeText.visible = false;
        } else {
            this.setFlagUp();

            if (!update.isAtBase) {
                this.timeText.visible = true;
                this.timeText.x = this.sprite.x;
                this.timeText.y = this.sprite.y;
                this.timeText.text = Math.round(this.returnTime).toString();
            } else {
                this.timeText.visible = false;
            }
        }
    }

    setFlagUp(): void {
        // animations
        this.isFlagUp = true;
        this.sprite.animations.play('flag_up');
    }

    setFlagDown(): void {
        this.isFlagUp = false;
        this.sprite.animations.play('flag_down');
    }
}
