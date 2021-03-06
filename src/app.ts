import 'p2';
import 'pixi';
import 'phaser';

import * as WebFontLoader from 'webfontloader';

import Boot from './states/boot';
import Preloader from './states/preloader';
import MainMenu from './states/mainmenu';
import LobbySelection from './states/lobbyselection';
import LobbyCreation from './states/lobbycreation';
import Lobby from './states/lobby';
import LobbyPlayer from './states/lobbyplayer';
import HowToPlay from './states/howtoplay';
import Options from './states/options';
import Game from './states/game';
import ButtonUtil from './states/buttonutil';
import Item from './states/item';
import HealthPot from './states/healthpot';
import CooldownPot from './states/cooldownpot';
import * as Utils from './utils/utils';
import * as Assets from './assets';

class App extends Phaser.Game {
    constructor(config: Phaser.IGameConfig) {
        super (config);

        this.state.add('boot', Boot);
        this.state.add('preloader', Preloader);
        this.state.add('mainmenu', MainMenu);
        this.state.add('lobbyselection', LobbySelection);
        this.state.add('lobbycreation', LobbyCreation);
        this.state.add('lobby', Lobby);
        this.state.add('howtoplay', HowToPlay);
        this.state.add('options', Options);
        this.state.add('game', Game);

        this.state.start('boot');
    }
}

function startApp(): void {
    let gameWidth: number = window.innerWidth;
    let gameHeight: number = window.innerHeight;

    if (SCALE_MODE === 'USER_SCALE') {
        let screenMetrics: Utils.ScreenMetrics = Utils.ScreenUtils.calculateScreenMetrics(gameWidth, gameHeight);

        gameWidth = screenMetrics.gameWidth;
        gameHeight = screenMetrics.gameHeight;
    }

    // There are a few more options you can set if needed, just take a look at Phaser.IGameConfig
    let gameConfig: Phaser.IGameConfig = {
        width: gameWidth,
        height: gameHeight,
        renderer: Phaser.AUTO,
        parent: 'game',
        resolution: 1
    };

    let app = new App(gameConfig);
}

window.onload = () => {
    let webFontLoaderOptions: any = null;
    let webFontsToLoad: string[] = GOOGLE_WEB_FONTS;

    if (webFontsToLoad.length > 0) {
        webFontLoaderOptions = (webFontLoaderOptions || {});

        webFontLoaderOptions.google = {
            families: webFontsToLoad
        };
    }

    if (Object.keys(Assets.CustomWebFonts).length > 0) {
        webFontLoaderOptions = (webFontLoaderOptions || {});

        webFontLoaderOptions.custom = {
            families: [],
            urls: []
        };

        for (let font in Assets.CustomWebFonts) {
            webFontLoaderOptions.custom.families.push(Assets.CustomWebFonts[font].getFamily());
            webFontLoaderOptions.custom.urls.push(Assets.CustomWebFonts[font].getCSS());
        }
    }

    if (webFontLoaderOptions === null) {
        // Just start the game, we don't need any additional fonts
        startApp();
    } else {
        // Load the fonts defined in webFontsToLoad from Google Web Fonts, and/or any Local Fonts then start the game knowing the fonts are available
        webFontLoaderOptions.active = startApp;

        WebFontLoader.load(webFontLoaderOptions);
    }
};
