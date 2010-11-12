/**
 * Client hud package
 */
WebTrek.Client.Hud = {};

/**
 * Base class for hud elements
 */
WebTrek.Client.Hud.ElementBase = Class.extend({

    visible: true,
    position: [0, 0],

    init: function (options) {
        this.options = _.extend({
            position: [0, 0]
        }, options);
        this.position = this.options.position;
    },

    hide: function () { this.visible = false; },
    show: function () { this.visible = true; },
    draw: function (ctx, tick, delta, remainder) { },
    onAdd: function (viewport, width, height) { },
    onResize: function (width, height) { },

    EOF:null
});

/**
 * Simple reticule
 */
WebTrek.Client.Hud.Reticule = WebTrek.Client.Hud.ElementBase.extend({

    onAdd: function (viewport, width, height) {
        this.position = [ width/2, height/2 ];
    },
    
    onResize: function (width, height) {
        this.position = [ width/2, height/2 ];
    },

    draw: function (ctx, tick, delta, remainder) {

        ctx.save();
        ctx.translate(this.position[0], this.position[1]);

        ctx.strokeStyle = 'rgba(0,255,0,0.1)';
        ctx.lineWidth = 4;
        this.viewport.circle(0, 0, 75);
        ctx.stroke();
        this.viewport.circle(0, 0, 2);
        ctx.stroke();

        ctx.restore();
    }

});

WebTrek.Client.Hud.TextBase = WebTrek.Client.Hud.ElementBase.extend({
    init: function (options) {
        this._super(_.extend({
            font: '13px Arial',
            color: 'rgb(255,255,0)',
            position: [ 20, 20 ]
        }, options));
    },
    draw: function (ctx, tick, delta, remainder) {
        var text = this.updateText(tick, delta, remainder);
        
        ctx.save();
        ctx.translate(this.position[0], this.position[1]);
        ctx.font = this.options.font;
        ctx.fillStyle = this.options.color;
        ctx.textAlign = 'left';
        ctx.fillText(text, 0, 0, 0);
        ctx.restore();
    }
});

/**
 * FPS meter
 */
WebTrek.Client.Hud.FPS = WebTrek.Client.Hud.TextBase.extend({
    updateText: function (tick, delta, remainder) {
        var fps = this.viewport.stats.frame_count / ( tick / 1000 );
        var text = 'FPS: ' + parseInt(fps, 10);
        return text;
    }
});

/**
 * Input states
 */
WebTrek.Client.Hud.InputState = WebTrek.Client.Hud.TextBase.extend({
    init: function (options) {
        this._super(_.extend({
            color: 'rgb(255,0,0)',
            keyboard: null
        }, options));
        this.keyboard = this.options.keyboard;
    },
    onAdd: function (viewport, width, height) {
        this.position = [ 10, height-20 ];
    },
    onResize: function (width, height) {
        this.position = [ 10, height-20 ];
    },
    updateText: function () {
        var out = [],
            bs = this.keyboard.options.bindings;
        for (var b in bs) {
            out.push(b+': '+this.keyboard.on(b));
        }
        return 'KEYS: ' + out.join('; ');
    }
});

WebTrek.Client.Hud.AvatarState = WebTrek.Client.Hud.InputState.extend({
    init: function (options) {
        this._super(_.extend({
            color: 'rgb(255,0,0)',
            avatar: null
        }, options));
    },
    onAdd: function (viewport, width, height) {
        this.position = [ 10, height-40 ];
    },
    onResize: function (width, height) {
        this.position = [ 10, height-40 ];
    },
    updateText: function () {
        return _.template(
            'SHIP: '+
            'act: <%=action.thrust%>, <%=action.rotate%>, <%=action.fire%>'+
            'angle=<%=Math.round(angle)%>; vel=<%=velocity[0]%>, '+
            '<%=velocity[1]%>; pos=<%=position[0]%>, <%=position[1]%>; '+
            '',
            this.options.avatar
        );
    }
});
