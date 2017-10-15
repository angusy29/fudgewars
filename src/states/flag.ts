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
    isAtBase: boolean = true;
    carriedBy: number = null;
    indicatorSprite: Phaser.Sprite;
    indicatorText: Phaser.Text;

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
        this.sprite = game.add.sprite(x, y, Atlases.SpritesheetsItemsSpritesheet.getName(), Flag.colors[colorIdx][0]);
        this.sprite.anchor.setTo(0, 1); // reset the anchor to the center of the flag pole
        this.sprite.scale.setTo(0.6, 0.6); // scale down the flag
        this.sprite.animations.add('flag_up', Flag.colors[colorIdx], 5, true, false);
        this.sprite.animations.add('flag_down', [Flag.flagDownColors[colorIdx]], 5, true, false);

        this.indicatorSprite = game.add.sprite(x, y, Atlases.SpritesheetsItemsSpritesheet.getName(), Flag.colors[colorIdx][0]);
        this.indicatorSprite.scale.setTo(0.2, 0.2);
        this.indicatorSprite.visible = false;

        let color;
        if (colorIdx === Game.BLUE) {
            color = '#0000ff';
        } else {
            color = '#ff0000';
        }

        this.indicatorText = game.add.text(x, y, '', {
            font: '8px Arial',
            fill: color,
        });
        this.indicatorText.visible = false;

        this.timeText = game.add.text(x, y, '', {
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

    private updateIndicator(): void {
        let me = this.game.me;
        let cameraPos = this.game.camera.position;
        let screenTop = cameraPos.y + 20;
        let screenBottom = cameraPos.y + this.game.game.height - 20;
        let screenLeft = cameraPos.x + 20;
        let screenRight = cameraPos.x + this.game.game.width - 20;

        let onScreen = (this.sprite.x >= screenLeft && this.sprite.x <= screenRight &&
                        this.sprite.y >= screenTop && this.sprite.y <= screenBottom);
        if (!onScreen) {
            this.indicatorSprite.visible = true;

            if (!this.isAtBase) {
                if (this.carriedBy) {
                    this.indicatorText.text = 'CAPTURED';
                } else {
                    this.indicatorText.text = Math.round(this.returnTime).toString();
                }
                this.indicatorText.visible = true;
            }

            if (this.sprite.x < screenLeft) {
                this.indicatorSprite.x = screenLeft;
            } else if (this.sprite.x > screenRight) {
                this.indicatorSprite.x = screenRight;
            } else {
                this.indicatorSprite.x = this.sprite.x;
            }

            if (this.sprite.y < screenTop) {
                this.indicatorSprite.y = screenTop;
            } else if (this.sprite.y > screenBottom) {
                this.indicatorSprite.y = screenBottom;
            } else {
                this.indicatorSprite.y = this.sprite.y;
            }

            if (this.sprite.x < screenLeft) {
                this.indicatorText.anchor.x = 0;
                this.indicatorText.x = this.indicatorSprite.x + 10;
                this.indicatorText.y = this.indicatorSprite.y - 10;
            } else if (this.sprite.x > screenRight) {
                this.indicatorText.anchor.x = 1;
                this.indicatorText.x = this.indicatorSprite.x - 2;
                this.indicatorText.y = this.indicatorSprite.y + 2;
            } else if (this.sprite.y < screenTop) {
                this.indicatorText.anchor.x = 0.5;
                this.indicatorText.x = this.indicatorSprite.x;
                this.indicatorText.y = this.indicatorSprite.y + 20;
            } else {
                this.indicatorText.anchor.x = 0.5;
                this.indicatorText.x = this.indicatorSprite.x;
                this.indicatorText.y = this.indicatorSprite.y - 10;
            }

        } else {
            this.indicatorSprite.visible = false;
            this.indicatorText.visible = false;
        }
    }

    public update(update: any): void {
        this.isAtBase = update.isAtBase;
        this.carriedBy = update.carriedBy;
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

        this.updateIndicator();
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
