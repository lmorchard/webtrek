/**
 * Keyboard input class
 */
WebTrek_Client_Input_Keyboard = function (options) {
    return this.__construct(options);
};

WebTrek_Client_Input_Keyboard.KEYS = {
    meta: 18,
    shift: 16,
    ctrl: 17,
    a: 65,
    s: 83,
    d: 68,
    f: 70,
    z: 90,
    x: 88,
    c: 67, 
    v: 86,
    up: 38,
    down: 40,
    left: 37,
    right: 39,
    space: 32
};

(function () {

    WebTrek_Client_Input_Keyboard.prototype = {

        __construct: function (options) {

            this.options = _.extend({
                target: null,
                onkeypress: null,
                bindings: { }
            }, options);

            var $this = this,
                target = $this.options.target,
                states = $this.states = {};

            for (var i=0; i < 255; i++) {
                $this.states[i] = 0;
            }

            $this.states['shift'] = 0;
            $this.states['ctrl'] = 0;
            $this.states['alt'] = 0;
            $this.states['meta'] = 0;

            target.onkeypress = function(e) {
                if ($this.options.onkeypress) {
                    $this.options.onkeypress(e.keyCode || e.which, e);
                    e.preventDefault();
                }
            };

            target.onkeydown = function(e) {
                if($this.states[e.keyCode] == 0) {
                    $this.states[e.keyCode] = 1;
                }
                if (!$this.options.onkeypress) {
                    e.preventDefault();
                }
            };

            target.onkeyup = function(e) {
                if($this.states[e.keyCode] > 0) {
                    $this.states[e.keyCode] = 0;
                }
                if (!$this.options.onkeypress) {
                    e.preventDefault();
                }
            };

        },

        destroy: function () {
            this.target.onkeypress = null;
            this.target.onkeydown = null;
            this.target.onkeyup = null;
        },

        on: function (name) {
            var key = this.options.bindings[name];
            return this.states[key];
        },

        toggle: function (name) {
            var key = this.options.bindings[name];
            if (this.states[key] == 1) {
                this.states[key] = 2;
                return 1;
            }
            return 0;
        },

        EOF:null
    };

})();
