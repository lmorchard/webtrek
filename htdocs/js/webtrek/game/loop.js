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

        this.tick = this.options.tick;
        
        this._timer = null;
        this._kill = false;
    },

    start: function (tick, until) {

        if (tick) { this.tick = tick; }
        if (until) { this.options.until = until; }

        this._kill = false;

        var $this = this,
            ontick = $this.options.ontick,
            ondone = $this.options.ondone,
            tm_curr = new Date().getTime(),
            tm_new = null,
            delta = 0,
            accum = 0,
            tick_duration = $this.options.tick_duration,
            max_delta = $this.options.max_delta;

        $this._timer = setInterval(function () {

            // Bail if the loop is being killed.
            if ($this._kill) { return; }

            // Figure out the time delta since the last loop run
            tm_new = new Date().getTime();
            delta = (tm_new - tm_curr);
            tm_curr = tm_new;

            // Limit any loop catch-up to a maximum slice
            if (delta > max_delta) { delta = max_delta; }

            // Advance the time debt by delta since last loop run.
            // Every now and then, this might result in an extra tick
            accum += delta;

            // Play catch-up with loop ticks until the time debt is less
            // than the tick duration.
            var should_kill = false;
            while (accum >= tick_duration) {
                accum -= tick_duration; // Pay off time debt.
                if (ontick) {
                    ontick($this.tick, tick_duration); // Perform game tick.
                }

                $this.tick += tick_duration; // Advance the game clock.
                if ($this.options.until && $this.tick >= $this.options.until) {
                    break;
                }
            }

            // Done catching up with the tick, report stats
            if (ondone) {
                ondone($this.tick, tick_duration, accum / tick_duration);
            }
            
            // If given a run-until time, self-terminate if it's been reached.
            if ($this.options.until && $this.tick >= $this.options.until) {
                $this.kill();
            }
            
        }, $this.options.interval_delay);
    },

    kill: function() {
        this._kill = true;
        if (this._timer) { 
            clearInterval(this._timer); 
        }
        if (this.options.onkill) { 
            this.options.onkill(this); 
        }
    },

    EOF:null
});
