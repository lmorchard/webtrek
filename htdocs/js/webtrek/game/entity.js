/**
 * Package for active game entities
 */
WebTrek.Game.Entity = {};

/**
 * Base class for active game entities
 */
WebTrek.Game.Entity.EntityBase = Class.extend({

    view_class: null,

    init: function (options) {
        this.options = _.extend({
            owner: null,
            position: [ 0, 0 ],
            size: [ 10, 10 ],
            angle: 0,
            time_to_live: false
        }, options);

        this.created = null;
        this.owner = this.options.owner;
        this.position = this.options.position;
        this.position_sv = [ this.position[0], this.position[1] ];
        this.size = _.clone(this.options.size);
        this.angle = this.options.angle;
    },

    getView: function () {
        if (this.view_class && !this.view) {
            this.view = new this.view_class(this);
        }
        return this.view;
    },
    
    update: function (time, delta) {
        if (!this.created) { this.created = time; }
        var age = (time - this.created);
        if (this.options.time_to_live && age > this.options.time_to_live) {
            this.destroy();
        }
    },

    destroy: function () {
        this.world.removeEntity(this.id);
    }

});

// Export for CommonJS / node.js
try { 
    global.WebTrek.Game.Entity.EntityBase = 
        WebTrek.Game.Entity.EntityBase; 
} catch(e) { }

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

    update: function (time, delta) {
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

        var move_x = ( speed_x / 1000 ) * delta,
            move_y = ( speed_y / 1000 ) * delta,
            new_x  = this.position[0] + move_x,
            new_y  = this.position[1] + move_y,
            bounce = this.options.bounce;
        
        if (new_x < 0 || new_x > this.world.options.width) {
            this.onBounce(time, delta);
            if (!bounce) {
                return this.destroy();
            } else {
                new_x -= move_x;
                speed_x = 0 - ( speed_x * this.options.bounce );
            }
        }
        if (new_y < 0 || new_y > this.world.options.height) {
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

        this._super(time, delta);
    }

});

// Export for CommonJS / node.js
try { 
    global.WebTrek.Game.Entity.MotionBase = 
        WebTrek.Game.Entity.MotionBase; 
} catch(e) { }

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
            size: [ 20, 30 ],
            rotation_per_delta: 0.005,
            thrust_accel:  700,
            reverse_accel: 700,
            max_speed: 500,
            bounce: 0.8,
            reload_delay: 250
        },options));
    },

    setAction: function (action) {
        this.action = action;
    },

    update: function (time, delta) {
        var a = this.action;

        this.rotation = a.rotate * this.options.rotation_per_delta;

        var accel;
        if (a.thrust > 0) { 
            accel = delta * ( this.options.thrust_accel / 1000 ); 
        } else if (a.thrust < 0) { 
            accel = 0 - (delta * ( this.options.reverse_accel / 1000 )); 
        } else {
            accel = 0;
        }
        this.acceleration = accel;

        this._super(time, delta);

        if (a.fire && ((time-this.last_fired) >= this.options.reload_delay)) {
            this.last_fired = time;
            this.fireBullet(time, delta);
        }

    },

    fireBullet: function (time, delta) {
        this.world.addEntity(
            new WebTrek.Game.Entity.Bullet({ 
                owner: this 
            })
        );
    }

});

// Export for CommonJS / node.js
try { 
    global.WebTrek.Game.Entity.Avatar = 
        WebTrek.Game.Entity.Avatar; 
} catch(e) { }

/**
 * Bullet entity
 */
WebTrek.Game.Entity.Bullet = WebTrek.Game.Entity.MotionBase.extend({

    view_class: (!WebTrek.Client) ? null : 
        WebTrek.Client.EntityView.BulletView,

    init: function (options) {
        this._super(_.extend({
            owner: null,
            size: [ 2, 2 ],
            max_speed: 700,
            acceleration: 0,
            time_to_live: 5000,
            bounce: 1,
            max_bounces: 2
        },options));

        var owner = this.options.owner;
        var angle = owner.angle;
        var max_speed = this.options.max_speed;

        // Adopt owner's angle
        this.angle = angle;

        // Spawn forward of the owner
        this.position = [ 
            owner.position[0] + 
                Math.cos(angle - Math.PI / 2) * owner.size[0] * 1,
            owner.position[1] + 
                Math.sin(angle - Math.PI / 2) * owner.size[0] * 1
        ];

        // Adopt the owner's velocity plus bullet's own speed along angle
        this.velocity = [
            Math.cos(angle - Math.PI / 2) * (max_speed) + owner.velocity[0],
            Math.sin(angle - Math.PI / 2) * (max_speed) + owner.velocity[1]
        ];

        this.bounces_count = 0;
    },

    onBounce: function (time, delta) {
        if (this.bounce_count++ > this.options.max_bounces) {
            this.destroy();
        }
    }

});

// Export for CommonJS / node.js
try { 
    global.WebTrek.Game.Entity.Bullet = 
        WebTrek.Game.Entity.Bullet; 
} catch(e) { }
