/**
 * Package for active game entities
 */
WebTrek.Game.Entity = {};

/**
 * Base class for active game entities
 */
WebTrek.Game.Entity.EntityBase = Class.extend({

    position: [ 0, 0 ],
    position_sv: [ 0, 0 ],
    velocity: [ 0, 0 ],
    acceleration: 0,
    angle: 0,
    view: null,
    view_class: null,

    init: function (options) {
        this.options = _.extend({
            position: [ 0, 0 ],
            angle: 0
        }, options);

        this.position = this.options.position;
        this.angle = this.options.angle;

    },

    getView: function () {
        if (this.view_class && !this.view) {
            this.view = new this.view_class(this);
        }
        return this.view;
    },
    
    update: function (world, time, delta) {
    },

    destroy: function () {
    },

    EOF:null
});

WebTrek.Game.Entity.MotionBase = WebTrek.Game.Entity.EntityBase.extend({

    init: function (options) {
        this._super(_.extend({
            bounce: 0.8
        },options));
    },

});

/**
 * Avatar entity class
 */
WebTrek.Game.Entity.Avatar = WebTrek.Game.Entity.MotionBase.extend({

    init: function (options) {
        this._super(_.extend({
            rotation_per_delta: 0.005,
            thrust_accel: 0.0005,
            reverse_accel: 0.0005,
            max_speed: 0.4,
            bounce: 0.8
        },options));
    },

    action: {
        thrust: 0,
        rotate: 0,
        fire: false
    },

    view_class: (!WebTrek.Client) ? null : 
        WebTrek.Client.EntityView.AvatarView,

    setAction: function (action) {
        this.action = action;
    },

    update: function (world, time, delta) {

        var a = this.action,
            angle = this.angle,
            max_speed = this.options.max_speed;

        if (0 !== a.rotate) {
            var rotate = a.rotate * this.options.rotation_per_delta;
            this.angle += rotate * delta;
        }

        var accel;
        if (0 === a.thrust) { accel = 0; }
        else if (a.thrust > 0) { accel = delta * this.options.thrust_accel; }
        else if (a.thrust < 0) { accel = 0 - (delta * this.options.reverse_accel); }

        this.acceleration = accel;

        var speed_x = this.velocity[0] + accel * Math.sin(angle);
        var speed_y = this.velocity[1] - accel * Math.cos(angle);
        var speed   = Math.sqrt(Math.pow(speed_x,2) + Math.pow(speed_y,2));

        if (speed > max_speed) {
            speed_x = speed_x / speed * max_speed;
            speed_y = speed_y / speed * max_speed;
        }

        var move_x = speed_x * delta,
            move_y = speed_y * delta,
            new_x  = this.position[0] + move_x,
            new_y  = this.position[1] + move_y;
        
        if (new_x < 0 || new_x > world.options.width) {
            new_x -= move_x;
            speed_x = 0 - ( speed_x * this.options.bounce );
        }
        if (new_y < 0 || new_y > world.options.height) {
            new_y -= move_y;
            speed_y = 0 - ( speed_y * this.options.bounce );
        }

        this.position = [ new_x, new_y ];
        this.velocity = [ speed_x, speed_y ];

    },

    EOF:null

});

/**
 * Bouncer entity class
 */
WebTrek.Game.Entity.Bouncer = WebTrek.Game.Entity.EntityBase.extend({

    init: function (options) {
        this._super(options);
        this.delta_x = 1 + Math.random()*6;
        this.delta_y = 1 + Math.random()*6;
        this.delta_r = ( ( Math.PI * 2 ) / 100 ) * ( 1 + (Math.random()) );
    },

    view_class: (!WebTrek.Client) ? null : 
        WebTrek.Client.EntityView.AvatarView,

    update: function (world, time, delta) {

        var x = this.position[0],
            y = this.position[1],
            r = this.angle,
            max_x = world.options.width,
            max_y = world.options.height,
            max_r = ( Math.PI * 2 );

        x += this.delta_x;
        if (x < 0) { x = 0; this.delta_x = -this.delta_x; }
        if (x > max_x) { x = max_x; this.delta_x = -this.delta_x; }

        y += this.delta_y;
        if (y < 0) { y = 0; this.delta_y = -this.delta_y; }
        if (y > max_y) { y = max_y; this.delta_y = -this.delta_y; }

        r += this.delta_r;
        if (r < 0) { r = 0; this.delta_r = -this.delta_r; }
        if (r > max_r) { r = max_r; this.delta_r = -this.delta_r; }

        this.position = [ x, y ];
        this.angle = r;

    },

    EOF:null

});

