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

    init: function (options) {
        this._super(_.extend({
            update_period: 250,
            max_samples: 10
        },options));

        this.samples = [];

        this.last_time = 0;
        this.last_count = 0;

        this.fps = 0;
        this.avg_fps = 0;
    },

    updateText: function (time, delta, remainder) {

        if ((time-this.last_time) > this.options.update_period) {

            var fps = parseInt(
                ( this.viewport.stats.frame_count - this.last_count ) /
                ( ( time - this.last_time ) / 1000 ) , 10);
                
            this.last_time = time;
            this.last_count = this.viewport.stats.frame_count;

            this.samples.push(fps);
            if (this.samples.length > this.options.max_samples) {
                this.samples.shift();
            }

            this.fps = fps;
            this.avg_fps = parseInt(
                _(this.samples).reduce(function (sum,n) { 
                    return sum+n; 
                }, 0) / this.samples.length, 
            10);
        }
        var text = _.template(
            'FPS: <%=avg_fps%> avg / <%=fps%> median', this
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
            client: null,
            update_period: 1000,
            max_lag_count: 20
        }, options));

        this.last_update = 0;
        this.last_stats = _.clone(this.options.client.socket.stats);
        this.text = 'NET:';
        this.last_bytes_in = 0;
        this.last_bytes_out = 0;

        this.bytes_in = [];
        this.bytes_out = [];
    },

    onResize: function (width, height) {
        this.position = [ 10, height-60 ];
    },

    calcRate: function (stat) {
        return Math.round( stat.bytes / stat.messages );
    },
    
    updateText: function (time, delta, remainder) {
        var t_delta = time - this.last_update;
        if ( t_delta > this.options.update_period ) {

            var client = this.options.client,
                median_ping = client.pings[parseInt(client.pings.length/2, 10)],
                avg_ping = WebTrek.Utils.avg(client.pings);

                rate_in = ( client.socket.stats.input.bytes - this.last_bytes_in ),
                rate_out = ( client.socket.stats.output.bytes - this.last_bytes_out );

            this.text = 'NET: ' +
                'rate = ' + rate_in + ' in / ' + rate_out + ' out; ' +
                'ping = ' + median_ping + ' median / ' + avg_ping + ' avg';

            this.last_update = time;
            this.last_bytes_in = client.socket.stats.input.bytes;
            this.last_bytes_out = client.socket.stats.output.bytes;
        
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
