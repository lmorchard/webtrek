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
            max_delta: 6000
        }, options);

        this.hub = new WebTrek.Utils.PubSub();
        this.tick = this.options.tick;
    },

    reset: function (tm_curr) {
        this._timer = null;
        this._kill = false;
        this.accum = 0;
        this.tick = tm_curr || 0;
        this.tm_curr = tm_curr || (new Date().getTime());

        this.hub.publish('reset');
        return this;
    },

    start: function (tick, until) {
        if (tick) { this.tick = tick; }
        if (until) { this.options.until = until; }

        this.reset();

        var $this = this;
        this._timer = setInterval(
            function () { $this.tickOnce(new Date().getTime()); },
            this.options.interval_delay
        );

        this.hub.publish('start');
        return this;
    },

    tickOnce: function (tm_now) {
        var ontick = this.options.ontick,
            ondone = this.options.ondone,
            tick_duration = this.options.tick_duration,
            max_delta = this.options.max_delta;

        // Bail if the loop is being killed.
        if (this._kill) { return; }

        // Figure out the time delta since the last loop run
        var delta = (tm_now - this.tm_curr);
        this.tm_curr = tm_now;

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

        return this;
    },

    kill: function() {
        this._kill = true;
        if (this._timer) { 
            clearInterval(this._timer); 
        }
        this.hub.publish('kill');

        return this;
    }

});
