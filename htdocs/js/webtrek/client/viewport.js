/**
 * Game canvas
 */
WebTrek.Client.Viewport = function (options) { 
    return this.__construct(options); 
};
(function () {

var full_circle = Math.PI * 2;
var vmath = WebTrek.Math;

WebTrek.Client.Viewport.prototype = {

    __construct: function (options) {

        this.options = _.extend({

            world: null,

            width: 640,
            height: 480,

            camera_center: [ 1000, 1000 ],

            grid_cell_size: 200,
            grid_line_width: 0.5,
            grid_cell_color: 'rgba(255,255,255,0.3)',

            canvas: null,
            fullscreen: true,
            background: '#000',
            fullscreen_cb: null
        
        }, options);

        this.world = this.options.world;

        this.tracking = null;

        this.canvas = this.options.canvas;
        this.canvas.width = this.options.width;
        this.canvas.height = this.options.height;

        this.ctx = this.canvas.getContext("2d");
        this.ctx.fillStyle = this.options.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.setCameraCenter(this.options.camera_center);

        if (this.options.fullscreen) {
            this.initFullscreen(this.options.fullscreen_cb);
        }

    },

    setCameraCenter: function (pos) {

        var camx = pos[0],
            camy = pos[1],
            camw = this.canvas.width,
            camw2 = camw/2,
            camh = this.canvas.height,
            camh2 = camh/2;

        this.camera = { 
            center: [ camx, camy ],
            lt:     [ camx-camw2, camy-camh2 ],
            rb:     [ camx+camw2, camy+camh2 ],
            size:   [ camw, camh ],
            scale: 1
        };

    },

    startTracking: function (entity) {
        this.tracking = entity;
    },

    stopTracking: function (entity) {
        this.tracking = null;
    },

    initFullscreen: function (fs_callback) {
        var $this = this;
        window.onresize = function() {
            
            $this.canvas.width = window.innerWidth || 
                document.documentElement.clientWidth;
            $this.canvas.height = document.documentElement.clientHeight;

            $this.setCameraCenter($this.camera.center);
            
            if (fs_callback) { 
                fs_callback($this.canvas.width, $this.canvas.height);
            }

        };
        window.onresize();
    },

    update: function (tick, delta, remainder) {
        this.wipe(tick, delta, remainder);
        if (this.tracking) {
            this.setCameraCenter(this.tracking.position);
        }
        this.draw_backdrop(tick, delta, remainder);
        this.draw_entities(tick, delta, remainder);
        this.draw_hud(tick, delta, remainder);
    },

    wipe: function (tick, delta, remainder) {
        this.ctx.save();
        this.ctx.fillStyle = "rgba(0, 0, 0, 1)";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();      
    },

    draw_backdrop: function (tick, delta, remainder) {

        var ctx  = this.ctx,
            cam  = this.camera;

        var camx = cam.center[0];
        var camy = cam.center[1];
        var camw = cam.size[0];
        var camh = cam.size[1];

        var vp_left   = cam.lt[0];
        var vp_right  = cam.rb[0];
        var vp_top    = cam.lt[1];
        var vp_bottom = cam.rb[1];

        var worldw = this.world.options.width;
        var worldh = this.world.options.height;
        
        var cell_size = this.options.grid_cell_size;
        var cell_color = this.options.grid_cell_color;

        var x, y;

        ctx.save();

        ctx.fillStyle = 'black';
        ctx.strokeStyle = this.options.grid_cell_color;
        ctx.lineWidth = this.options.grid_line_width;
        
        ctx.beginPath();

        x = (vp_left < 0) ? -vp_left : cell_size - ( vp_left % cell_size );
        y = (vp_top < 0) ? -vp_top : cell_size - ( vp_top % cell_size );

        while(x < camw) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, camh);
            x += cell_size;
        }

        while(y < camh) {
            ctx.moveTo(0, y);
            ctx.lineTo(camw, y);
            y += cell_size;
        }

        ctx.stroke();

        // Left Edge
        if (vp_left < 0) {
            ctx.fillRect(0, 0, -vp_left, camh);
        }

        // Top Edge
        if (vp_top < 0) {
            ctx.fillRect(0, 0, camw, -vp_top);
        }
        
        // Right Edge
        if (vp_right > worldw) {
            ctx.fillRect(camw - (vp_right - worldw), 0, camw, camh);
        }

        // Bottom Edge
        if (vp_bottom > worldh) {
            ctx.fillRect(0, camh - (vp_bottom - worldh), camw, camh);
        }

        ctx.restore();

    },

    draw_entities: function (tick, delta, remainder) {
        var entities = this.world.entities;
        var ctx = this.ctx;
        for (var id in entities) { if (entities.hasOwnProperty(id)) {
            var entity = this.world.entities[id],
                view = entity.getView();
            if (view) { 
                var point = vmath.vector_sub(entity.position, this.camera.lt);

                /*
                $('#console').val(
                    "HONK: " + [
                        this.camera.lt, entity.position, point
                    ].map(function (a) { return a.join(", "); }).join("\n")
                );
                */

                ctx.save();
                ctx.translate(point[0], point[1]);
                view.draw(this, tick, delta, remainder); 
                ctx.restore();
            }
        }}
    },

    draw_hud: function (tick, delta, remainder) {
        var ctx = this.ctx;
        ctx.save();
        ctx.strokeStyle = 'rgba(0,255,0,0.1)';
        ctx.lineWidth = 4;
        this.circle(this.canvas.width / 2, this.canvas.height / 2, 75);
        ctx.stroke();
        this.circle(this.canvas.width / 2, this.canvas.height / 2, 2);
        ctx.stroke();
        ctx.restore();
    },

    circle: function(x, y, r) {
        var ctx = this.ctx;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, full_circle, true);
        ctx.closePath();
    },

    EOF:null
};

})();