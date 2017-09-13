import * as Assets from '../assets';
import { NumberUtils } from '../utils/utils';
import { Atlases } from '../assets';

export default class Flag {
    id: number;
    sprite: Phaser.Sprite = null;

    private static colors: any = [
        [
            Atlases.ItemsSpritesheet.Frames.FlagBlue,
            Atlases.ItemsSpritesheet.Frames.FlagBlue2
        ],
        [
            Atlases.ItemsSpritesheet.Frames.FlagGreen,
            Atlases.ItemsSpritesheet.Frames.FlagGreen2,
        ],
        [
            Atlases.ItemsSpritesheet.Frames.FlagRed,
            Atlases.ItemsSpritesheet.Frames.FlagRed2,
        ],
        [
            Atlases.ItemsSpritesheet.Frames.FlagYellow,
            Atlases.ItemsSpritesheet.Frames.FlagYellow2,
        ]
    ];

    constructor(game: any, x: number, y: number, colorIdx: number) {
        // this.sprite = game.add.sprite(x, y, Flag.registeredFlags[colorIdx][0] , 0);
        this.sprite = game.add.sprite(x, y, Atlases.ItemsSpritesheet.getName() , Flag.colors[colorIdx][0]);
        this.sprite.anchor.setTo(0, 1); // reset the anchor to the center of the flag pole
        this.sprite.scale.setTo(0.6, 0.6); // scale down the flag
        // animations
        this.sprite.animations.add('flag_move', Flag.colors[colorIdx], 5, true, false);
        this.sprite.animations.play('flag_move');
    }
}