import * as Assets from '../assets';
import * as AssetUtils from '../utils/assetUtils';

/*
 * After loading assets, this will start game.ts
 */
export default class Preloader extends Phaser.State {

    public preload(): void {
        this.initLoadingBar();
        AssetUtils.Loader.loadAllAssets(this.game, this.waitForSoundDecoding, this);
    }

    private initLoadingBar(): void {
        let loadingBarHeight: number = 20;

        let loadingBar = this.game.add.bitmapData(this.game.width, loadingBarHeight);
        loadingBar.ctx.beginPath();
        loadingBar.ctx.rect(0, 0, this.game.width, loadingBarHeight);
        loadingBar.ctx.fillStyle = '#00FF00';
        loadingBar.ctx.fillRect(0, 0, this.game.width, loadingBarHeight);

        let loadingBarBg = this.game.add.bitmapData(this.game.width, loadingBarHeight);
        loadingBarBg.ctx.beginPath();
        loadingBarBg.ctx.rect(0, 0, this.game.width, loadingBarHeight);
        loadingBarBg.ctx.fillStyle = '#FFFFFF';
        loadingBarBg.ctx.fillRect(0, 0, this.game.width, loadingBarHeight);

        let loadingBarBgSprite = this.game.add.sprite(0, this.game.width / 2, loadingBarBg);
        let loadingBarSprite = this.game.add.sprite(0, this.game.width / 2, loadingBar);

        this.load.setPreloadSprite(loadingBarSprite);
    }

    private waitForSoundDecoding(): void {
        AssetUtils.Loader.waitForSoundDecoding(this.startGame, this);
    }

    private startGame(): void {
        // this.game.camera.onFadeComplete.addOnce(this.loadTitle, this);
        // this.game.camera.fade(0x000000, 1000);
        let gameMusic = this.game.sound.play('adventureMeme');
        gameMusic.loopFull();
        this.loadMainMenu();
    }

    private loadMainMenu(): void {
        this.game.state.start('mainmenu');
    }
}
