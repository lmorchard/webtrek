/**
 * Game event loop
 */
WebTrek.Game.Loop = Class.extend({

    init: function (options) {
        this.options = _.extend({
            ontick: null,
            ondone: null,
            onkill: null,
            tick: 0,
            until: null,
            interval_delay: 10,
            tick_duration: 17,
            max_delta: 250
        }, options);

        this.hub = new WebTrek.Utils.PubSub();

        this.tick = this.options.tick;
        
        this._timer = null;
        this._kill = false;
    },

    start: function (tick, until) {
        if (tick) { this.tick = tick; }
        if (until) { this.options.until = until; }

        this._kill = false;
        this.accum = 0;
        this.tm_curr = new Date().getTime();

        this._timer = setInterval(
            _(this.tickOnce).bind(this), 
            this.options.interval_delay
        );

        this.hub.publish('start');
    },

    tickOnce: function () {
        var ontick = this.options.ontick,
            ondone = this.options.ondone,
            tick_duration = this.options.tick_duration,
            max_delta = this.options.max_delta;

        // Bail if the loop is being killed.
        if (this._kill) { return; }

        // Figure out the time delta since the last loop run
        var tm_new = new Date().getTime();
        var delta = (tm_new - this.tm_curr);
        this.tm_curr = tm_new;

        // Limit any loop catch-up to a maximum slice
        if (delta > max_delta) { delta = max_delta; }

        // Advance the time debt by delta since last loop run.
        // Every now and then, this might result in an extra tick
        this.accum += delta;

        // Play catch-up with loop ticks until the time debt is less
        // than the tick duration.
        var should_kill = false;
        while (this.accum >= tick_duration) {
            this.accum -= tick_duration; // Pay off time debt.
            this.hub.publish('tick', this.tick, tick_duration);
            this.tick += tick_duration; // Advance the game clock.
        }

        // Done catching up with the tick, report stats
        this.hub.publish('done', this.tick, tick_duration, 
            this.accum / tick_duration);
        
        // If given a run-until time, self-terminate if it's been reached.
        if (this.options.until && this.tick >= this.options.until) {
            this.kill();
        }
    },

    kill: function() {
        this._kill = true;
        if (this._timer) { 
            clearInterval(this._timer); 
        }
        this.hub.publish('kill');
    },

    EOF:null
});
