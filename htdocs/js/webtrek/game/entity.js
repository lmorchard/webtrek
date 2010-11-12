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
    angle: 0,
    view: null,
    view_class: null,
    created: null,

    init: function (options) {
        this.options = _.extend({
            position: [ 0, 0 ],
            angle: 0,
            time_to_live: false
        }, options);

        this.position = this.options.position;
        this.position_sv = this.options.position;
        this.angle = this.options.angle;
    },

    getView: function () {
        if (this.view_class && !this.view) {
            this.view = new this.view_class(this);
        }
        return this.view;
    },
    
    update: function (world, time, delta) {
        if (!this.created) { this.created = time; }
        var age = (time - this.created);
        if (this.options.time_to_live && age > this.options.time_to_live) {
            this.destroy();
        }
    },

    destroy: function () {
        this.world.removeEntity(this.id);
    },

    EOF:null
});

/**
 * Basic moving entity.
 */
WebTrek.Game.Entity.MotionBase = WebTrek.Game.Entity.EntityBase.extend({

    velocity: [ 0, 0 ],
    acceleration: 0,
    rotation: 0,

    init: function (options) {
        this._super(_.extend({
            velocity: [ 0, 0 ],
            acceleration: 0,
            rotation: 0,
            max_speed: 0.4,
            bounce: false
        },options));

        this.rotation = this.options.rotation;
        this.velocity = this.options.velocity;
        this.acceleration = this.options.acceleration;
    },

    onBounce: function (time, delta) {
    },

    update: function (world, time, delta) {
        var accel     = this.acceleration,
            angle     = this.angle,
            max_speed = this.options.max_speed,
            speed_x   = this.velocity[0] + accel * Math.sin(angle),
            speed_y   = this.velocity[1] - accel * Math.cos(angle),
            speed     = Math.sqrt(Math.pow(speed_x,2) + Math.pow(speed_y,2));

        if (speed > max_speed) {
            speed_x = speed_x / speed * max_speed;
            speed_y = speed_y / speed * max_speed;
        }

        var move_x = speed_x * delta,
            move_y = speed_y * delta,
            new_x  = this.position[0] + move_x,
            new_y  = this.position[1] + move_y,
            bounce = this.options.bounce;
        
        if (new_x < 0 || new_x > world.options.width) {
            this.onBounce(time, delta);
            if (!bounce) {
                return this.destroy();
            } else {
                new_x -= move_x;
                speed_x = 0 - ( speed_x * this.options.bounce );
            }
        }
        if (new_y < 0 || new_y > world.options.height) {
            this.onBounce(time, delta);
            if (!bounce) {
                return this.destroy();
            } else {
                new_y -= move_y;
                speed_y = 0 - ( speed_y * this.options.bounce );
            }
        }
        
        var angle = this.angle;
        angle += this.rotation * delta;
        if (angle > Math.PI) angle = -Math.PI;
        else if(angle < -Math.PI) angle = Math.PI;

        this.angle    = angle;
        this.position = [ new_x, new_y ];
        this.velocity = [ speed_x, speed_y ];

        this._super(world, time,delta);
    }

});

/**
 * Player-controlled avatar entity.
 */
WebTrek.Game.Entity.Avatar = WebTrek.Game.Entity.MotionBase.extend({

    last_fired: 0,

    view_class: (!WebTrek.Client) ? null : 
        WebTrek.Client.EntityView.AvatarView,

    action: {
        thrust: 0,
        rotate: 0,
        fire: false
    },

    init: function (options) {
        this._super(_.extend({
            rotation_per_delta: 0.005,
            thrust_accel: 0.0005,
            reverse_accel: 0.0005,
            max_speed: 0.4,
            bounce: 0.8,
            fire_delay: 300
        },options));
    },

    setAction: function (action) {
        this.action = action;
    },

    update: function (world, time, delta) {
        var a = this.action;

        this.rotation = a.rotate * this.options.rotation_per_delta;

        var accel;
        if (a.thrust > 0) { 
            accel = delta * this.options.thrust_accel; 
        } else if (a.thrust < 0) { 
            accel = 0 - (delta * this.options.reverse_accel); 
        } else {
            accel = 0;
        }
        this.acceleration = accel;

        if (a.fire) {
            var fire_since = time - this.last_fired;
            if (fire_since >= this.options.fire_delay) {
                this.last_fired = time;

                var new_bullet = new WebTrek.Game.Entity.Bullet({
                    position: this.position,
                    velocity: this.velocity,
                    angle:    this.angle,
                });
                this.world.addEntity(new_bullet);
            }
        }

        return this._super(world, time, delta);
    },

    EOF:null

});

/**
 * Bullet entity
 */
WebTrek.Game.Entity.Bullet = WebTrek.Game.Entity.MotionBase.extend({

    bounce_count: 0,

    view_class: (!WebTrek.Client) ? null : 
        WebTrek.Client.EntityView.BulletView,

    init: function (options) {
        this._super(_.extend({
            max_speed: 0.4125,
            acceleration: 0.5,
            bounce: 1,
            max_bounces: 2
        },options));
    },

    onBounce: function (time, delta) {
        if (this.bounce_count++ > this.options.max_bounces) {
            this.destroy();
        }
    },

    update: function (world, time, delta) {

        var accel     = this.acceleration,
            angle     = this.angle,
            max_speed = this.options.max_speed,
            speed_x   = this.velocity[0],
            speed_y   = this.velocity[1],
            speed     = Math.sqrt(Math.pow(speed_x,2) + Math.pow(speed_y,2));

        if (speed >= max_speed) {
            this.acceleration = 0;
        }

        return this._super(world, time, delta);
    },

    EOF:null
});

/**
 * Bouncer entity class
 */
WebTrek.Game.Entity.Bouncer = WebTrek.Game.Entity.MotionBase.extend({

    view_class: (!WebTrek.Client) ? null : 
        WebTrek.Client.EntityView.BulletView,

    init: function (options) {
        this._super(_.extend({
            velocity: [ 1 + Math.random()*6,  1 + Math.random()*6 ],
            rotation: 0.01 * Math.random(),
            bounce:   1.0
        },options));
    },

    EOF:null
});
