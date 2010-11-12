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
            width:  1500,
            height: 1500
        });

        $this.viewport = new WebTrek.Client.Viewport({
            canvas: this.options.document.getElementById("display"),
            world: $this.world,
            fullscreen: true,
            camera_center: [ 
                $this.world.options.width / 2, 
                $this.world.options.height / 2
            ], 
            hud_elements: {
                fps: new WebTrek.Client.Hud.FPS({ }),
                reticule: new WebTrek.Client.Hud.Reticule({ })
            }
        });

        var KEYS = WebTrek.Client.Input.Keyboard.KEYS;
        $this.player = new WebTrek.Game.Player({
            keyboard: new WebTrek.Client.Input.Keyboard({
                target: this.options.document,
                bindings: {
                    'thrust': KEYS.up,
                    'reverse': KEYS.down,
                    'rotate_left': KEYS.left,
                    'rotate_right': KEYS.right,
                    'fire': KEYS.space
                }
            }),
            avatar: new WebTrek.Game.Entity.Avatar({
                position: [ 400, 400 ]
            })
        });

        /*
        $this.viewport.addHudElement(
            'input_state', 
            new WebTrek.Client.Hud.InputState({ 
                keyboard: $this.player.keyboard
            })
        );

        $this.viewport.addHudElement(
            'avatar_state', 
            new WebTrek.Client.Hud.AvatarState({ 
                avatar: $this.player.avatar
            })
        );
        */

        $this.world.addPlayer($this.player);
        $this.world.addEntity($this.player.avatar);
        $this.viewport.startTracking($this.player.avatar);

        $this.loop = new WebTrek.Game.Loop({
            ontick: function (time, delta) {
                $this.processInput(time, delta);
                $this.world.update(time, delta);
            },
            ondone: function (time, delta, remainder) {
                $this.viewport.update(time, delta, remainder);
            }
        });

        /*
        for (var i=0; i<5; i++) {
            $this.world.addEntity(new WebTrek.Game.Entity.Bouncer({
                position: [ 
                    $this.world.options.width * Math.random(), 
                    $this.world.options.height * Math.random() 
                ]
            }));
        }
        */

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
