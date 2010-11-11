/**
 * Game event loop
 */
WebTrek_Game_Loop = function (options) {
    return this.__construct(options);
};
(function () {

    WebTrek_Game_Loop.prototype = {

        __construct: function (options) {
            this.options = _.extend({
                ontick: null,
                ondone: null,
                tick: 0,
                interval_delay: 10,
                tick_duration: 15,
                max_delta: 250
            }, options);

            this.tick = this.options.tick;
            
            this._timer = null;
            this._kill = false;
        },

        start: function () {
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
                while (accum >= tick_duration) {
                    accum -= tick_duration; // Pay off time debt.
                    if (ontick) {
                        ontick($this.tick, tick_duration); // Perform game tick.
                    }
                    $this.tick += tick_duration; // Advance the game clock.
                }

                // Done catching up with the tick, report stats
                if (ondone) {
                    ondone($this.tick, tick_duration, accum / tick_duration);
                }

            }, $this.options.interval_delay);
        },

        kill: function() {
            this._kill = true;
            if (this._timer) { clearInterval(this._timer); }
        },

        EOF:null
    };

})();
