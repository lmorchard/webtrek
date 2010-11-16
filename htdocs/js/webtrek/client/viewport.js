/**
 * Game canvas
 */
WebTrek.Client.Viewport = Class.extend(function () {

    var full_circle = Math.PI * 2;
    var vmath = WebTrek.Math;

    return {

        init: function (options) {

            this.options = _.extend({

                world: null,

                width: 640,
                height: 480,

                camera_center: [ 1200, 1200 ],
                hud_elements: {},

                draw_backdrop_image: true,

                grid_cell_size: 150,
                grid_line_width: 1,
                grid_line_color: 'rgba(192,192,192,0.4)',
                grid_cell_color: 'rgba(0, 0, 0, 0.6)',
                background_wipe: "rgba(0, 0, 0, 1.0)",
                // To see trails:
                // background_wipe: "rgba(0, 0, 0, 0.2)",

                canvas: null,
                fullscreen: true,
                background: '#000',

            }, options);

            this.stats = {
                frame_count: 0
            };

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
                this.initFullscreen();
            }

            this.hud_elements = {};
            for (var id in this.options.hud_elements) {
            this.addHudElement(id, this.options.hud_elements[id]);
        }

    },

    addHudElement: function (id, element) {
        element.viewport = this;
        this.hud_elements[id] = element;
        element.onAdd(this, this.canvas.width, this.canvas.height);
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

    initNonFullscreen: function () {
        var $this = this;
        $this.canvas.width = 640;
        $this.canvas.height = 480;

        $this.setCameraCenter($this.camera.center);

        var hud_elements = $this.hud_elements;
        for (var id in hud_elements) {
            hud_elements[id].onResize($this.canvas.width, $this.canvas.height);
        }
    },

    initFullscreen: function (fs_callback) {
        var $this = this;
        window.onresize = function() {
            $this.canvas.width = window.innerWidth || 
            document.documentElement.clientWidth;
            $this.canvas.height = document.documentElement.clientHeight;

            $this.setCameraCenter($this.camera.center);

            var hud_elements = $this.hud_elements;
            for (var id in hud_elements) {
                hud_elements[id].onResize($this.canvas.width, $this.canvas.height);
            }
        };
        window.onresize();
    },

    update: function (tick, delta, remainder) {
        this.stats.frame_count++;

        this.wipe(tick, delta, remainder);

        if (this.tracking) {
            this.setCameraCenter(this.tracking.state.position);
        }

        this.draw_backdrop(tick, delta, remainder);
        this.draw_entities(tick, delta, remainder);
        this.draw_hud(tick, delta, remainder);
    },

    wipe: function (tick, delta, remainder) {
        this.ctx.save();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();      
    },

    draw_entities: function (tick, delta, remainder) {
        var entities = this.world.entities;
        var ctx = this.ctx;
        for (var id in entities) { if (entities.hasOwnProperty(id)) {
            var entity = this.world.entities[id],
            view = entity.getView();
            if (view) { 
                var point = vmath.vector_sub(entity.state.position, this.camera.lt);
                ctx.save();
                ctx.translate(point[0], point[1]);
                view.beforeDraw(ctx, tick, delta, remainder)
                    .draw(ctx, tick, delta, remainder)
                    .afterDraw(ctx, tick, delta, remainder); 
                ctx.restore();
            }
            }}
        },

        draw_hud: function (tick, delta, remainder) {
            var hud_elements = this.hud_elements;
            var ctx = this.ctx;
            for (var id in hud_elements) {
                var element = hud_elements[id];
                if (element.visible) {
                    ctx.save();
                    element.draw(ctx, tick, delta, remainder);
                    ctx.restore();
                }
            }
        },

        /**
         * Draw a grid, relative to the camera.
         * TODO: Optimize this, since it gets run on every frame, ugh.
         */
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

            ctx.save();

            ctx.fillStyle = this.options.grid_cell_color;
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            var cell_size = this.options.grid_cell_size;

            var x, y;

            ctx.fillStyle = this.options.grid_cell_color;
            ctx.strokeStyle = this.options.grid_line_color;
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
                ctx.clearRect(0, 0, -vp_left, camh);
            }

            // Top Edge
            if (vp_top < 0) {
                ctx.clearRect(0, 0, camw, -vp_top);
            }

            // Right Edge
            if (vp_right > worldw) {
                ctx.clearRect(camw - (vp_right - worldw), 0, camw, camh);
            }

            // Bottom Edge
            if (vp_bottom > worldh) {
                ctx.clearRect(0, camh - (vp_bottom - worldh), camw, camh);
            }

            if (this.options.draw_backdrop_image) {
                ctx.globalCompositeOperation = 'destination-over';
                var backdrop_image = $('#backdrop_image')[0];

                var vw = worldw + camw,
                    vh = worldh + camh,
                    scale = 0;

                if (backdrop_image.width < backdrop_image.height) {
                    scale = backdrop_image.width / vw;
                } else {
                    scale = backdrop_image.height / vh;
                }

                var bx = ( vp_left + (camw/2) ) * scale * 0.5,
                    by = ( vp_top + (camh/2) ) * scale * 0.5,
                    bw = camw * scale * 2,
                    bh = camh * scale * 2;

                ctx.drawImage(backdrop_image, 
                    bx, by, bw, bh,
                    0, 0, camw, camh
                );
            }

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

}());
