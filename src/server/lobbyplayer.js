module.exports = class LobbyPlayer {
    constructor(id, name, tile, team) {
        this.id = id;
        this.name = name;
        this.team = team;
        this.tile = tile;
        this.isReady = false;
        this.accessoryTile = 0;
    }

    getRep() {
        return {
            id: this.id,
            name: this.name,
            team: this.team,
            tile: this.tile,
            isReady: this.isReady,
            accessoryTile: this.accessoryTile
        }
    }
}