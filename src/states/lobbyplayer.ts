
export default class LobbyPlayer {
    id: any;
    name: Phaser.Text;      // child of sprite
    team: number;           // 0 for blue, 1 for red
    sprite: Phaser.Sprite;
    tile: number;           // the current tile which the player is on in the lobby
    isReady: boolean;

    constructor(id, name, team, tile, sprite) {
        this.id = id;
        this.name = name;
        this.team = team;
        this.tile = tile;
        this.isReady = false;
    }

    public setIsReady(b: boolean): void {
        this.isReady = b;
    }

    public getIsReady(): boolean {
        return this.isReady;
    }
}