/**
 * Game canvas
 */
WebTrek.Client.Viewport = function (options) { 
    return this.__construct(options); 
};
(function () {

var full_circle = Math.PI * 2;

WebTrek.Client.Viewport.prototype = {

    __construct: function (options) {

        this.options = _.extend({
            canvas: null,
            fullscreen: true,
            width: 640,
            height: 480,
            background: '#000',
            fullscreen_cb: null
        }, options);

        this.canvas = this.options.canvas;
        this.canvas.width = this.options.width;
        this.canvas.height = this.options.height;

        this.ctx = this.canvas.getContext("2d");
        this.ctx.fillStyle = this.options.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.options.fullscreen) {
            this.initFullscreen(this.options.fullscreen_cb);
        }

    },

    initFullscreen: function (fs_callback) {
        var $this = this;
        window.onresize = function() {
            $this.canvas.width = window.innerWidth || 
                document.documentElement.clientWidth;
            $this.canvas.height = document.documentElement.clientHeight;
            if (fs_callback) { 
                fs_callback($this.canvas.width, $this.canvas.height);
            }
        };
        window.onresize();
    },

    update: function (tick, duration, remainder) {

    },

    circle: function(x, y, r) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, r, 0, full_circle, true);
        this.ctx.closePath();
    },

    EOF:null
};

})();
