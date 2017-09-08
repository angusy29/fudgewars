import * as Assets from '../assets';
import * as AssetUtils from '../utils/assetUtils';

export default class Preloader extends Phaser.State {

    public preload(): void {
        AssetUtils.Loader.loadAllAssets(this.game, this.waitForSoundDecoding, this);
    }

    private waitForSoundDecoding(): void {
        AssetUtils.Loader.waitForSoundDecoding(this.startGame, this);
    }

    private startGame(): void {
        // this.game.camera.onFadeComplete.addOnce(this.loadTitle, this);
        // this.game.camera.fade(0x000000, 1000);
        this.loadTitle();
    }

    private loadTitle(): void {
        this.game.state.start('title');
    }
}
