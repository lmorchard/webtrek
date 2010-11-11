WebTrek.Client.EntityView = {};

/**
 * Base class for active game entity views
 */
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

/**
 * Avatar view class
 */
WebTrek.Client.EntityView.AvatarView = WebTrek.Client.EntityView.EntityViewBase.extend({

    draw: function (ctx, time, delta, remainder) {

        ctx.save();

        ctx.rotate(this.entity.angle);
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(7, 10);
        ctx.lineTo(-7, 10);
        ctx.lineTo(0, -10);
        ctx.stroke();
        ctx.fill();

        ctx.restore();

    },

    EOF:null

});
