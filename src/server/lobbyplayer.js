module.exports = class LobbyPlayer {
    constructor(id, name, team) {
        this.id = id;
        this.name = name;
        this.team = team;
        this.isReady = false;
    }

    getRep() {
        return {
            id: this.id,
            name: this.name,
            team: this.team,
            isReady: this.isReady
        }
    }
}