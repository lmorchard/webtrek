/**
 * Game world
 */
WebTrek.Game.World = function (options) {
    return this.__construct(options); 
};
(function () {

WebTrek.Game.World.prototype = {

    __construct: function (options) {

        this.options = _.extend({
            
            width: 2000,
            height: 2000

        }, options);

        this.entity_last_id = 0;
        this.entities = {};
    },

    addEntity: function (entity) {
        var entity_id = this.entity_last_id++;
        entity.id = entity_id;
        this.entities[entity_id] = entity;
    },

    removeEntity: function (entity_id) {
        delete this.entities[entity_id];
    },

    update: function (tick, duration) {
        for (var id in this.entities) {
            var e = this.entities[id];
            e.update(this, tick, duration);
        }
    },

    EOF:null
};

})();
