/**
 * Avatar view class
 */
WebTrek.Client.EntityView.AvatarView = WebTrek.Client.EntityView.EntityViewBase.extend({

    draw: function (viewport, time, delta, remainder) {

        var ctx = viewport.ctx;
        ctx.save();

        ctx.rotate(this.entity.angle);
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 4;

        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(10, 10);
        ctx.lineTo(-10, 10);
        ctx.lineTo(0, -10);
        ctx.fill();

        ctx.restore();

    },

    EOF:null

});
