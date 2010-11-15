/**
 * Package for entity views
 */
WebTrek.Client.EntityView = {};

/**
 * Base class for active game entity views
 */
WebTrek.Client.EntityView.EntityViewBase = Class.extend({

    DEBUG: true,

    init: function (entity, options) {
        this.entity = entity;
        this.options = _.extend({

        }, options);
    },

    beforeDraw: function (ctx, time, delta, remainder, draw_cb) {
        ctx.save();
        ctx.rotate(this.entity.state.angle);
        ctx.translate( 0-(this.entity.options.size[0]/2), 0-(this.entity.options.size[1]/2) );
        return this;
    },

    draw: function (ctx, time, delta, remainder, draw_cb) {
        return this;
    },

    afterDraw: function (ctx, time, delta, remainder, draw_cb) {
        ctx.restore();
        return this;
    },

    EOF:null
});

/**
 * Avatar view class
 */
WebTrek.Client.EntityView.AvatarView = WebTrek.Client.EntityView.EntityViewBase.extend({
    draw: function (ctx, time, delta, remainder) {
        var w = this.entity.options.size[0],
            h = this.entity.options.size[1];

        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(w/2, 0);
        ctx.lineTo(w, h);
        ctx.lineTo(w/2, h-(h/4));
        ctx.lineTo(0, h);
        ctx.lineTo(w/2, 0);
        ctx.stroke();
        ctx.fill();
        ctx.restore();
        return this;
    }
});

/**
 * Bullet view class
 */
WebTrek.Client.EntityView.BulletView = WebTrek.Client.EntityView.EntityViewBase.extend(
    (function () {
        var full_circle = Math.PI * 2;
        return {
            draw: function (ctx, time, delta, remainder) {
                ctx.save();
                ctx.fillStyle = 'rgba(255,255,255,0.2)';
                ctx.strokeStyle = 'rgba(255,255,255,0.7)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(0, 0, this.entity.options.size[0], 0, full_circle, true);
                ctx.closePath();
                ctx.stroke();
                ctx.fill();
                ctx.restore();
                return this;
            }
        };
    })()
);
