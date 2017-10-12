import { NumberUtils } from '../utils/utils';
import { Atlases } from '../assets';

export default class Flag {
    id: number;
    sprite: Phaser.Sprite = null;
    isFlagUp: boolean = false;

    private static colors: any = [
        [
            Atlases.SpritesheetsItemsSpritesheet.Frames.FlagBlue,
            Atlases.SpritesheetsItemsSpritesheet.Frames.FlagBlue2
        ],
        [
            Atlases.SpritesheetsItemsSpritesheet.Frames.FlagGreen,
            Atlases.SpritesheetsItemsSpritesheet.Frames.FlagGreen2,
        ],
        [
            Atlases.SpritesheetsItemsSpritesheet.Frames.FlagRed,
            Atlases.SpritesheetsItemsSpritesheet.Frames.FlagRed2,
        ],
        [
            Atlases.SpritesheetsItemsSpritesheet.Frames.FlagYellow,
            Atlases.SpritesheetsItemsSpritesheet.Frames.FlagYellow2,
        ]
    ];

    private static flagDownColors: any = [
        Atlases.SpritesheetsItemsSpritesheet.Frames.FlagBlueHanging,
        Atlases.SpritesheetsItemsSpritesheet.Frames.FlagGreenHanging,
        Atlases.SpritesheetsItemsSpritesheet.Frames.FlagRedHanging,
        Atlases.SpritesheetsItemsSpritesheet.Frames.FlagYellowHanging,
    ];

    constructor(game: any, x: number, y: number, colorIdx: number, captured: boolean) {
        this.id = colorIdx;
        // this.sprite = game.add.sprite(x, y, Flag.registeredFlags[colorIdx][0] , 0);
        this.sprite = game.add.sprite(x, y, Atlases.SpritesheetsItemsSpritesheet.getName() , Flag.colors[colorIdx][0]);
        this.sprite.anchor.setTo(0, 1); // reset the anchor to the center of the flag pole
        this.sprite.scale.setTo(0.6, 0.6); // scale down the flag
        this.sprite.animations.add('flag_up', Flag.colors[colorIdx], 5, true, false);
        this.sprite.animations.add('flag_down', [Flag.flagDownColors[colorIdx]], 5, true, false);
        // game.physics.enable(this.sprite, Phaser.Physics.ARCADE); // setup physics engine

        if (captured) {
            this.setFlagDown();
        } else {
            this.setFlagUp(); // flag up
        }
    }

    public update(update: any): void {
        this.sprite.x = update.x;
        this.sprite.y = update.y;
        if (update.isCaptured) {
            this.setFlagDown();
        } else {
            this.setFlagUp();
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
