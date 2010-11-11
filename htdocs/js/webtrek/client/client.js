/**
 * Main driver for webtrek
 */
WebTrek_Client = function (options) {
    return this.__construct(options); 
};
(function () {

    WebTrek_Client.prototype = {
    
        __construct: function (options) {
            this.options = _.extend({
                document: document,
            }, options);
        },

        init: function () {
            var $this = this;

            this.g_canvas = new WebTrek_Client_GameCanvas({
                canvas: this.options.document.getElementById("display"),
                fullscreen: true
            });

            var KEYS = WebTrek_Client_Input_Keyboard.KEYS;
            this.keyboard = new WebTrek_Client_Input_Keyboard({
                target: this.options.document,
                bindings: {
                    'thrust': KEYS['up'],
                    'reverse': KEYS['down'],
                    'rotate_left': KEYS['left'],
                    'rotate_right': KEYS['right'],
                    'fire': KEYS['space']
                },
                onkeypress: function (key, e) {
                }
            });

            this.loop = new WebTrek_Game_Loop({
                ontick: function (tick, duration) {
                    $this.onTick(tick, duration);
                },
            });
            this.loop.start();

            //$this.doSocketFun();
        },

        onTick: function () {
            var out = [];
            for (k in this.keyboard.options.bindings) {
                out.push(k + '=' + this.keyboard.on(k));
            }
            $('#console').val('KEYS: ' + out.join(", "));
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


;(function($) {

	function FPS(el_selector) {
		this.el = $(el_selector);
		this.last_tick = 0;
		this.last_fps_tick = 0;
		this.frames = 0;
		this.fps = 0;
		this.slice = 0;
	}
	FPS.get_tick = function() {
		return new Date().getTime();
	};
	FPS.prototype.start = function() {
		this.last_tick = this.last_fps_tick = FPS.get_tick();
	};
	FPS.prototype.enter_frame = function() {
		this.frames += 1;
		
		var current_tick = FPS.get_tick();
		var time_slice = current_tick - this.last_tick;
		this.last_tick = current_tick;
		
		if (this.frames % 20 === 0) {
			this.fps = ~~(this.frames / ((current_tick - this.last_fps_tick) / 1000));
			this.frames = 0;
			this.last_fps_tick = current_tick;
			this.slice = time_slice;
			this.render();
		}
		return time_slice;
	};
	FPS.prototype.render = function() {
		this.el.html("fps: " + this.fps + ", slice: " + this.slice);
	};

	window.FPS = FPS;

})(jQuery);

