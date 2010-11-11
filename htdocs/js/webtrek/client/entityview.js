/**
 * Base class for active game entity views
 */
WebTrek.Client.EntityView = {};
WebTrek.Client.EntityView.EntityViewBase = Class.extend({

    init: function (entity, options) {
        this.entity = entity;
        this.options = _.extend({

        }, options);
    },

    draw: function (viewport, time, delta, remainder) {
    },

    EOF:null
});
