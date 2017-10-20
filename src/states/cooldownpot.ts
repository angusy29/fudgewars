import * as Assets from '../assets';
import Game from './game';
import Item from './item';

// Server decides to spawn an item
// Server decides if its a health potion, a cooldown potion or a speed boost
// Server picks a coordinate to spawn the item
// Client updates and renders the item on screen
// Player collides with the item
export default class CooldownPot extends Item {
    constructor(game: Game, x: number, y: number) {
        super(game, x, y, 'cooldownpot');
    }
}