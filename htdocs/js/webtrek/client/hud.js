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
    draw: function (ctx, time, delta, remainder) { },
    onAdd: function (viewport, width, height) {
        this.viewport = viewport;
        this.onResize(width, height);
    },
    onResize: function (width, height) { }

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

    draw: function (ctx, time, delta, remainder) {

        ctx.save();
        ctx.translate(this.position[0], this.position[1]);

        ctx.strokeStyle = 'rgba(0,192,0,0.3)';
        ctx.lineWidth = 4;
        this.viewport.circle(0, 0, 75);
        ctx.stroke();

        ctx.restore();
    }

});

/**
 * Basic line-of-text HUD element
 */
WebTrek.Client.Hud.TextBase = WebTrek.Client.Hud.ElementBase.extend({

    init: function (options) {
        this._super(_.extend({
            font: '13px Arial',
            color: 'rgb(255,255,0)',
            position: [ 20, 20 ]
        }, options));
    },
    
    draw: function (ctx, time, delta, remainder) {
        var text = this.updateText(time, delta, remainder);
        
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

    update_period: 250,

    init: function (options) {
        this._super(options);
        this.last_time = 0;
        this.last_count = 0;
        this.fps = 0;
        this.avg_fps = 0;
    },

    updateText: function (time, delta, remainder) {
        var fps = 0;
        if ((time-this.last_time) > this.update_period) {
            this.fps = parseInt(
                ( this.viewport.stats.frame_count - this.last_count ) /
                ( ( time - this.last_time ) / 1000 ) , 10);
            this.avg_fps = 
                parseInt(this.viewport.stats.frame_count / ( time / 1000 ))
            this.last_time = time;
            this.last_count = this.viewport.stats.frame_count;
        }
        var text = _.template(
            'FPS: <%=avg_fps%> avg / <%=fps%> curr', this
        );
        return text;
    }

});

/**
 * Netstat meter
 */
WebTrek.Client.Hud.Netstat = WebTrek.Client.Hud.TextBase.extend({
    
    init: function (options) {
        this._super(_.extend({
            color: 'rgb(255,0,0)',
            stats: null,
            update_period: 250,
            max_lag_count: 20
        }, options));

        this.stats = this.options.stats;
        this.last_time = 0;
        this.sum_lag = 0
        this.count_lag = 0;
        this.text = 'NET:';
    },

    onResize: function (width, height) {
        this.position = [ 10, height-60 ];
    },

    calcRate: function (stat) {
        return Math.round( stat.bytes / stat.messages );
    },
    
    updateText: function (time, delta, remainder) {

        if ( (time-this.last_time) > this.options.update_period ) {
            
            this.last_time = time;

            var in_rate  = this.calcRate(this.stats.t_in),
                out_rate = this.calcRate(this.stats.t_out),
                lag      = this.stats.ping.latency;

            this.count_lag++;
            this.sum_lag += lag;

            var avg_lag  = Math.round( this.sum_lag / this.count_lag ); 

            this.text = 'NET: ' + this.stats.t_in.messages + ';' + 
                ' Bytes = ' + in_rate + ' in / ' + out_rate + ' out;' + 
                ' Ping = ' + avg_lag + ' avg / ' + lag + ' curr' + 
                ' Tick = ' + this.stats.remote_tick + ' / ' + time + " / " + (time - this.stats.remote_tick);
        }

        if (this.count_lag > this.options.max_lag_count) {
            this.sum_lag = 0;
            this.count_lag = 0;
        }

        return this.text;
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

/**
 * Avatar state tracking
 */
WebTrek.Client.Hud.AvatarState = WebTrek.Client.Hud.InputState.extend({
    
    init: function (options) {
        this._super(_.extend({
            color: 'rgb(255,0,0)',
            avatar: null
        }, options));
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
