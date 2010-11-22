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
        this.time = 0;
        this.entity_last_id = -1;
        this.entities = {};
        this.player_last_id = -1;
        this.players = {};
    },

    isServer: function () {
        return !!this.options.is_server;
    },

    addEntity: function (entity) {
        if (null === entity.options.id) {
            while (this.entities[++this.entity_last_id]);
            entity.options.id = this.entity_last_id;
        }
        entity.world = this;
        this.entities[entity.options.id] = entity;
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
        if (!entity) { return; }
        this.hub.publish('removeEntity', entity);
        delete this.entities[entity_id];
    },

    addPlayer: function (player) {
        if (null === player.id) { 
            while (this.players[++this.player_last_id]);
            player.id = this.player_last_id; 
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
        if (!player) { return; }
        this.hub.publish('removePlayer', player);
        delete this.players[player_id];
    },

    update: function (time, delta) {
        this.time = time;
        this.hub.publish('beforeUpdate', [ time, delta ]);
        this.handleCollisions(time, delta);
        for (var id in this.players) {
            this.players[id].update(time, delta);
        }
        for (var id in this.entities) {
            var entity = this.entities[id];
            entity.performUpdate(time, delta);
        }
        this.hub.publish('update', [ time, delta ]);
    },

    /** Prepare a network-ready snapshot of the world */
    buildSnapshot: function () {

        var entities_out = [],
            w_entities = this.entities;
        for (var id in w_entities) {
            entities_out.push(w_entities[id].serialize());
        }

        return {
            width: this.options.width,
            height: this.options.height,
            entities: entities_out
        };
            
    },

    /** Update this world from a prepared snapshot */
    updateFromSnapshot: function (snapshot) {
        this.options.width = snapshot.width;
        this.options.height = snapshot.height;
        var s_entities = snapshot.entities;
        for (var i=0,s; s=s_entities[i]; i++) {
            this.addEntity(WebTrek.Game.Entity.deserialize(s));
        }
    },

    /** Search the world for collisions, handle them */
    handleCollisions: function (time, delta) {

        var entities = this.entities;

        for (var id1 in entities) {
            
            var en_a = entities[id1],
                a = en_a.getBounds();

            for (var id2 in entities) {
                if (id1 == id2) { continue; }
            
                var en_b = entities[id2],
                    b = en_b.getBounds();

                var x0 = Math.max(a.x, b.x);
                var x1 = Math.min(a.x + a.w, b.x + b.w);

                if (x0 <= x1) {
                    var y0 = Math.max(a.y, b.y);
                    var y1 = Math.min(a.y + a.h, b.y + b.h);

                    if (y0 <= y1) {
                        en_a.handleCollisionWith(time, delta, en_b);
                        en_b.handleCollisionWith(time, delta, en_a);
                    }
                }
            }
        }
    },

    EOF:null
});

// Export for CommonJS / node.js
try {
    globals.WebTrek.Game.World = WebTrek.Game.World;
} catch(e) { }
