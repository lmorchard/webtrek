/**
 * Game world
 */
WebTrek.Game.World = Class.extend({

    init: function (options) {
        this.options = _.extend({
            width: 2000,
            height: 2000
        }, options);

        this.entity_last_id = 0;
        this.entities = {};
        this.player_last_id = 0;
        this.players = {};
    },

    addEntity: function (entity) {
        var entity_id = this.entity_last_id++;
        entity.id = entity_id;
        entity.world = this;
        this.entities[entity_id] = entity;
    },

    removeEntity: function (entity_id) {
        delete this.entities[entity_id];
    },

    addPlayer: function (player) {
        if (!player.id) { player.id = this.player_last_id++; }
        player.world = this;
        this.players[player.id] = player;
    },

    removePlayer: function (player_id) {
        delete this.players[player_id];
    },

    update: function (tick, delta) {
        for (var id in this.players) {
            this.players[id].update(this, tick, delta);
        }
        for (var id in this.entities) {
            this.entities[id].update(this, tick, delta);
        }
    },

    EOF:null
});
