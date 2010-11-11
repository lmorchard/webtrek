/**
 * Main driver for webtrek
 */
WebTrek.Client = function (options) {
    return this.__construct(options); 
};
(function () {

WebTrek.Client.prototype = {

    __construct: function (options) {
        this.options = _.extend({
            document: document,
        }, options);
    },

    init: function () {
        var $this = this;

        $this.viewport = new WebTrek.Client.Viewport({
            canvas: this.options.document.getElementById("display"),
            fullscreen: true
        });

        var KEYS = WebTrek.Client.Input.Keyboard.KEYS;
        $this.keyboard = new WebTrek.Client.Input.Keyboard({
            target: this.options.document,
            bindings: {
                'thrust': KEYS['up'],
                'reverse': KEYS['down'],
                'rotate_left': KEYS['left'],
                'rotate_right': KEYS['right'],
                'fire': KEYS['space']
            }
        });

        $this.world = new WebTrek.Game.World({
        });

        $this.loop = new WebTrek.Game.Loop({
            ontick: function (tick, duration) {
                $this.processInput(tick, duration);
                $this.world.update(tick, duration);
            },
            ondone: function (tick, duration, remainder) {
                $this.viewport.update(tick, duration, remainder);
            }
        });

        $this.loop.start();

        //$this.doSocketFun();
    },

    processInput: function (tick, duration) {
        var $this = this;

        var out = [],
            k = $this.keyboard,
            b = k.options.bindings;

        for (name in b) {
            out.push(name + ':' + k.states[b[name]]);
        }

        $('#console').val('KEYS: ' + out.join(', ')); 
    },

    doSocketFun: function () {
        var $this = this;

        var socket = new io.Socket(null, {
            // rememberTransport: false,
        });

        socket.on('connect', function () {
            $this.log('connected');
            socket.send("HELLO THERE");

            (function () {
                var cnt = 0;
                var timer = setInterval(function () {
                    socket.send("CLIENT COUNT " + cnt);
                    if (cnt++ >= 100) { 
                        socket.send("Okay, done counting");
                        clearInterval(timer);
                    }
                }, 10);
            })();

        });
        socket.on('disconnect', function () {
            $this.log('disconnected');
        });
        socket.on('message', function (data) {
            $this.log("MSG: " + data);
        });
        socket.connect();
        
    },

    EOF:null
};

})();
