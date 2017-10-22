
export default class LobbyPlayer {
    id: any;
    name: Phaser.Text;      // child of sprite
    team: number;           // 0 for blue, 1 for red
    sprite: Phaser.Sprite;  // player sprite
    readyImg: Phaser.Sprite;     // the ready tick
    tile: number;           // the current tile which the player is on in the lobby
    isReady: boolean;
    accessory: Phaser.Sprite;   // accessory on top of head
    accessoryTile: number;      // chosen accessory

    public static ACCESSORY_X_OFFSET = 18;
    public static ACCESSORY_Y_OFFSET = 50;

    constructor(id, name, team, tile, sprite) {
        this.id = id;
        this.name = name;
        this.team = team;
        this.tile = tile;
        this.sprite = sprite;
        this.isReady = false;
        this.readyImg = null;
        this.accessoryTile = 0;
        this.accessory = null;
    }

    public setIsReady(b: boolean): void {
        this.isReady = b;
    }

    public getIsReady(): boolean {
        return this.isReady;
    }

    public setSprite(sprite: Phaser.Sprite): void {
        this.sprite = sprite;
    }

    public setName(name: Phaser.Text): void {
        this.name = name;
    }

    public setAccessory(tile: number, sprite: Phaser.Sprite): void {
        this.accessoryTile = tile;
        this.accessory = sprite;
    }
}