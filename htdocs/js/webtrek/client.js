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
            document: document
        }, options);
    },

    init: function () {
        var $this = this;

        $this.world = new WebTrek.Game.World({
            width: 800,
            height: 800
        });

        $this.viewport = new WebTrek.Client.Viewport({
            world: $this.world,
            canvas: this.options.document.getElementById("display"),
            camera_center: [ 300, 300 ],  
            // [ $this.world.options.width / 2, $this.world.options.height / 2], 
            fullscreen: true
        });

        var KEYS = WebTrek.Client.Input.Keyboard.KEYS;
        $this.keyboard = new WebTrek.Client.Input.Keyboard({
            target: this.options.document,
            bindings: {
                'thrust': KEYS.up,
                'reverse': KEYS.down,
                'rotate_left': KEYS.left,
                'rotate_right': KEYS.right,
                'fire': KEYS.space
            }
        });

        $this.loop = new WebTrek.Game.Loop({
            ontick: function (time, delta) {
                $this.processInput(time, delta);
                $this.world.update(time, delta);
            },
            ondone: function (time, delta, remainder) {
                $this.viewport.update(time, delta, remainder);
            }
        });

        var avatar = new WebTrek.Game.Entity.Avatar({
            position: [ 40, 100 ]
        });
        $this.world.addEntity(avatar);
        $this.viewport.startTracking(avatar);

        $this.world.addEntity(new WebTrek.Game.Entity.Avatar({
            position: [ 100, 30 ]
        }));

        $this.world.addEntity(new WebTrek.Game.Entity.Avatar({
            position: [ 100, 100 ]
        }));

        $this.loop.start();

        //$this.doSocketFun();
    },

    processInput: function (time, delta) {
        var $this = this;

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
