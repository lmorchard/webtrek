/**
 * Package for active game entities
 */
WebTrek.Game.Entity = {};

/**
 * Base class for active game entities
 */
WebTrek.Game.Entity.EntityBase = Class.extend({

    entity_type: 'EntityBase',

    /** Optional class to be used in rendering entity in viewport */
    view_class: null,

    /** Entity constructor */
    init: function (options) {

        this.options = _.extend({
            id: null,
            world: null,
            owner: null,
            owner_id: null,
            created: null,
            position: [ 0, 0 ],
            size: [ 10, 10 ],
            angle: 0,
            time_to_live: false
        }, options);

        this.id = this.options.id;
        this.world = this.options.world;
        this.created = this.options.created;
        
        if (this.options.owner_id) {
            this.owner = this.world.entities[this.options.owner_id];
        } else {
            this.owner = this.options.owner;
        }

        this.position = this.options.position;
        this.position_sv = [ this.position[0], this.position[1] ];
        this.size = _.clone(this.options.size);
        this.angle = this.options.angle;
    },

    /** Serialize this entity into an object suitable for init() */
    serialize: function (more_fields) {
        var fields = [ 
            'id', 'entity_type', 'created', 'position', 'size', 'angle', 'time_to_live' 
        ].concat(more_fields || []);

        var out = {};
        for (var i=0, name; name=fields[i]; i++) {
            out[name] = this[name];
        }
        return out;
    },

    /** Get an instance of this entity's view class, if available. */
    getView: function () {
        if (this.view_class && !this.view) {
            this.view = new this.view_class(this);
        }
        return this.view;
    },
    
    /** Let this entity take a turn updating itself. */
    update: function (time, delta) {
        if (!this.created) { this.created = time; }
        var age = (time - this.created);
        if (this.options.time_to_live && age > this.options.time_to_live) {
            this.destroy();
        }
    },

    /** Remove this entity from the world. */
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

    entity_type: 'MotionBase',

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

    /** Serialize this entity into an object suitable for init() */
    serialize: function (more) {
        return this._super([
            'rotation', 'velocity', 'acceleration', 'max_speed', 'bounce'
        ].concat(more||[]));
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
                new_x = (new_x < 0) ? 0 : this.world.options.width;
                speed_x = 0 - ( speed_x * this.options.bounce );
            }
        }
        if (new_y < 0 || new_y > this.world.options.height) {
            this.onBounce(time, delta);
            if (!bounce) {
                return this.destroy();
            } else {
                new_y = (new_y < 0) ? 0 : this.world.options.height;
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

    entity_type: 'Avatar',

    last_fired: 0,

    view_class: (!WebTrek.Client) ? null : 
        WebTrek.Client.EntityView.AvatarView,

    init: function (options) {
        this._super(_.extend({
            size: [ 20, 30 ],
            rotation_per_delta: 0.005,
            thrust_accel:  700,
            reverse_accel: 700,
            max_speed: 500,
            bounce: 0.8,
            reload_delay: 250,
            action: {
                thrust: 0,
                rotate: 0,
                fire: false
            }
        },options));

        this.action = this.options.action;
    },

    /** Serialize this entity into an object suitable for init() */
    serialize: function (more) {
        return this._super([
            // TODO: Maybe these need not be serialized, and just come with a
            // ship type modifier?
            'rotation_per_delta', 'thrust_accel', 'reverse_accel', 
            'reload_delay', 'action'
        ].concat(more||[]));
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
        if (!this.world.options.is_server) {
            // Only the server gets to fire real bullets.
            return;
        }
        var new_bullet = new WebTrek.Game.Entity.Bullet();
        new_bullet.launchFromOwner(this);
        this.world.addEntity(new_bullet);
        return new_bullet;
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

    entity_type: 'Bullet',

    view_class: (!WebTrek.Client) ? null : 
        WebTrek.Client.EntityView.BulletView,

    init: function (options) {
        this._super(_.extend({
            size: [ 2, 2 ],
            max_speed: 700,
            acceleration: 0,
            time_to_live: 5000,
            bounce: 1,
            max_bounces: 2,
            bounces_count: 0
        },options));

        this.max_bounces = this.options.max_bounces;
        this.bounces_count = this.options.bounces_count;
    },

    /** Launch as a projectile from an owner */
    launchFromOwner: function (owner) {
        this.owner = owner;

        // Adopt owner's angle
        var max_speed = this.options.max_speed;
        var angle = owner.angle;
        this.angle = angle;

        // Spawn forward of the owner
        this.position = [ 
            Math.min(this.owner.world.options.width, Math.max(0, 
                owner.position[0] + Math.cos(angle-Math.PI/2) * owner.size[0])),
            Math.min(this.owner.world.options.height, Math.max(0, 
                owner.position[1] + Math.sin(angle-Math.PI/2) * owner.size[0]))
        ];

        // Adopt the owner's velocity plus bullet's own speed along angle
        this.velocity = [
            Math.cos(angle-Math.PI/2) * (max_speed) + owner.velocity[0],
            Math.sin(angle-Math.PI/2) * (max_speed) + owner.velocity[1]
        ];

        // this.world.updateEntity(this);
    },

    /** Serialize this entity into an object suitable for init() */
    serialize: function (more) {
        var out = this._super([
            'max_bounces', 'bounces_count'
        ].concat(more||[]));
        out.owner_id = this.owner ? this.owner.id : null;
        return out;
    },

    /** */
    onBounce: function (time, delta) {
        if (this.bounce_count++ > this.max_bounces) {
            this.destroy();
        }
    }

});

// Export for CommonJS / node.js
try { 
    global.WebTrek.Game.Entity.Bullet = 
        WebTrek.Game.Entity.Bullet; 
} catch(e) { }
