/**
 * Base class for active game entities
 */
WebTrek.Game.Entity = {};
WebTrek.Game.Entity.EntityBase = Class.extend({

    position: [ 0, 0 ],
    angle: 0,
    view: null,
    view_class: null,

    init: function (options) {
        this.options = _.extend({
            position: [ 0, 0 ],
            angle: 0
        }, options);

        this.position = this.options.position;
        this.angle = this.options.angle;

    },

    getView: function () {
        if (this.view_class && !this.view) {
            this.view = new this.view_class(this);
        }
        return this.view;
    },
    
    update: function (world, time, delta) {
    },

    destroy: function () {
    },

    EOF:null
});
