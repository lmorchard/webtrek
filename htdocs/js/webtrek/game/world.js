/**
 * Game world
 */
WebTrek.Game.World = Class.extend({

    init: function (options) {
        this.options = _.extend({
            width: 2000,
            height: 2000,
            is_server: true
        }, options);

        this.hub = new WebTrek.Utils.PubSub();

        this.entity_last_id = 0;
        this.entities = {};
        this.player_last_id = 0;
        this.players = {};
    },

    addEntity: function (entity) {
        if (null === entity.id) {
            entity.id = this.entity_last_id++;
        }
        entity.world = this;
        this.entities[entity.id] = entity;
        this.hub.publish('addEntity', entity);
    },

    findEntity: function (entity_id) {
        return this.entities[entity_id];
    },

    updateEntity: function (entity) {
        this.hub.publish('updateEntity', entity);
    },

    removeEntity: function (entity_id) {
        var entity = this.entities[entity_id];
        this.hub.publish('removeEntity', entity);
        delete this.entities[entity_id];
    },

    addPlayer: function (player) {
        if (null === player.id) { 
            player.id = this.player_last_id++; 
        }
        player.world = this;
        this.players[player.id] = player;

        if (player.avatar) {
            this.addEntity(player.avatar);
        }
        this.hub.publish('addPlayer', player);
    },

    findPlayer: function (player_id) {
        return this.players[player_id];
    },

    removePlayer: function (player_id) {
        var player = this.players[player_id];
        this.hub.publish('removePlayer', player);
        delete this.players[player_id];
    },

    update: function (tick, delta) {
        for (var id in this.players) {
            this.players[id].update(tick, delta);
        }
        for (var id in this.entities) {
            this.entities[id].update(tick, delta);
        }
        this.hub.publish('update', [ tick, delta ]);
    },

    /** Prepare a network-ready snapshot of the world */
    serialize: function () {

        var entities_out = [],
            w_entities = this.entities;
        for (var id in w_entities) {
            var entity = w_entities[id];
            entities_out.push(entity.serialize());
        }

        return {
            width: this.options.width,
            height: this.options.height,
            entities: entities_out
        };
            
    },

    /** Accept a snapshot of the world and update */
    deserialize: function (data) {
    },

    addSerializedEntities: function (serialized) {
        for (var i=0, obj; obj=serialized[i]; i++) {
            this.deserializeEntity(obj);
        }
    },

    deserializeEntity: function (data) {
        var e_pkg = WebTrek.Game.Entity;
        if ('undefined' == typeof(data.entity_type)) { return; }
        if ('undefined' == typeof(e_pkg[data.entity_type])) { return; }
        data.world = this;
        var entity = new e_pkg[data.entity_type](data);
        this.addEntity(entity);
    },

    EOF:null
});

// Export for CommonJS / node.js
try {
    globals.WebTrek.Game.World = WebTrek.Game.World;
} catch(e) { }
