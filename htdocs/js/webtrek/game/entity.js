/**
 * Package for active game entities
 */
WebTrek.Game.Entity = (function () {
    
   var $this = {
        deserialize: function (s) {
            if (!$this[s[0]]) { return null; }
            return new $this[s[0]](s[1],s[2],s[3]);
        },
        EOF:null
    };

    return $this;
})();

/**
 * Base class for active game entities
 */
WebTrek.Game.Entity.EntityBase = Class.extend({

    entity_type: 'EntityBase',

    /** Optional class to be used in rendering entity in viewport */
    view_class: null,

    /** Entity constructor */
    init: function (options, state, action) {
        
        this.options = _.extend({
            id: null,
            world: null,
            owner_id: null,
            created: null,
            time_to_live: false,
            size: [ 10, 10 ],
            max_moves: 200,
            network_update_period: 250
        }, options);
        
        this.state = _.extend({
            position: [ 0, 0 ],
            angle: 0
        }, state);

        this.action = _.extend({
        }, action);

        this.world = this.options.world;
        this.created = this.options.created;
        this.moves = [];
        this.updating = false;
        this.last_network_update = 0;
        this.is_client = false;

        this.last_collision = 0;

    },

    serialize: function () {
        return [ 
            this.entity_type, 
            _.clone(this.options), 
            _.clone(this.state), 
            _.clone(this.action)
        ];
    },

    /** Remove this entity from the world. */
    destroy: function () {
        this.world.removeEntity(this.options.id);
    },

    /** Collect position & size into a single object */
    getBounds: function () {
        return {
            x: this.state.position[0],
            y: this.state.position[1],
            w: this.options.size[0],
            h: this.options.size[1]
        };
    },

    setState: function (state) {
        this.state = state;
    },

    setAction: function (action) {
        this.action = action;
    },

    getOwner: function () {
        if (!this.options.owner_id) { return null; }
        return this.world.findEntity(this.options.owner_id);
    },

    /** Get an instance of this entity's view class, if available. */
    getView: function () {
        if (this.view_class && !this.view) {
            this.view = new this.view_class(this);
        }
        return this.view;
    },

    /** Perform a complete update step */
    performUpdate: function (time, delta) {
        this.beforeUpdate(time, delta);
        this.update(time, delta);
        this.afterUpdate(time, delta);
    },

    /** Perform preparations before updating */
    beforeUpdate: function (time, delta) {
    },
    
    /** Let this entity take a turn updating itself. */
    update: function (time, delta) {
        if (!this.created) { this.created = time; }
        var age = (time - this.created),
            ttl = this.options.time_to_live;
        if (ttl && age > ttl) {
            this.destroy();
        }

        if (time - this.last_collision > 250) {
            this.in_collision = false;
        }
    },

    /** Save state after updating */
    afterUpdate: function (time, delta) {
        this.moves.push([ 
            time, delta, _.clone(this.state), _.clone(this.action) 
        ]);
        if (this.moves.length > this.options.max_moves) {
            this.moves.shift();
        }
    },

    /** Send a periodic remote update with a server */
    sendRemoteUpdate: function (time, delta, server) {
        if (!this.last_network_update) { this.last_network_update = time; }
        var network_age = time - this.last_network_update;
        if (network_age >= this.options.network_update_period) {
            this.last_network_update = time;
            server.broadcast(WebTrek.Network.OPS.ENTITY_UPDATE, 
                [ time, this.produceRemoteUpdate() ]);
        }
    },

    /** Produce a remote update structure for this entity's state */
    produceRemoteUpdate: function () {
        return [ this.options.id, this.state, this.action ];
    },

    /** Apply a remote update structure to this entity for the given tick */
    applyRemoteUpdate: function (tick, update) {

        var state_update = update[1],
            action_update = update[2];

        this.updating = true;

        // Use saved states to check if this update should be applied
        // retroactively in the past.
        var m_idx, move;
        for (m_idx=this.moves.length-1, move; move=this.moves[m_idx]; m_idx--) {
            if (tick >= move[0]) { break; }
        }

        if (!move || m_idx == this.moves.length-1) {

            // TODO: Do some interpolation smoothing in correction
            // Server update is newer than client, so just apply
            this.state = _(this.state).extend(state_update);
            this.action = _(this.action).extend(update[2]);

        } else {

            // Need to rewind/replay to accomodate server correction, so chop
            // off the set of moves that the client is ahead of the update.
            var replay = this.moves.splice(m_idx, ( this.moves.length - m_idx ));

            // Discard the first replay move, apply server update.
            // replay.shift();
            this.state = _(this.state).extend(update[1]);
            this.action = _(this.action).extend(update[2]);

            // Replay the moves from this point forward, re-applying actions
            // but letting the state sort itself out.
            for (var idx=0, move; move=replay[idx]; idx++) {
                this.action = _(this.action).extend(move[3]);
                this.performUpdate(move[0], move[1]);
            }

        }

        this.updating = false;

    },

    /** Handle a collision */
    handleCollisionWith: function(time, delta, other_entity) {
        this.last_collision = time;
        this.in_collision = true;
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

    view_class: (!WebTrek.Client) ? null : 
        WebTrek.Client.EntityView.AvatarView,

    init: function (options, state, action) {
        this._super(
            _.extend({
                max_speed: 0.4,
                bounce: false
            }, options),
            _.extend({
                velocity: [ 0, 0 ],
                rotation: 0,
                acceleration: 0
            }, state),
            _.extend({
            }, action)
        );
    },

    onBounce: function (time, delta) {
    },

    update: function (time, delta) {
        var accel     = this.state.acceleration,
            angle     = this.state.angle;
        
        angle += this.state.rotation * delta;
        if (angle > Math.PI) angle = -Math.PI;
        else if(angle < -Math.PI) angle = Math.PI;

        var max_speed = this.options.max_speed,
            speed_x   = this.state.velocity[0] + accel * Math.sin(angle),
            speed_y   = this.state.velocity[1] - accel * Math.cos(angle),
            speed     = Math.sqrt(Math.pow(speed_x,2) + Math.pow(speed_y,2));

        if (speed > max_speed) {
            speed_x = speed_x / speed * max_speed;
            speed_y = speed_y / speed * max_speed;
        }

        var move_x = ( speed_x / 1000 ) * delta,
            move_y = ( speed_y / 1000 ) * delta,
            new_x  = this.state.position[0] + move_x,
            new_y  = this.state.position[1] + move_y,
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

        this.state.angle    = angle;
        this.state.position = [ new_x, new_y ];
        this.state.velocity = [ speed_x, speed_y ];

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

    init: function (options, state, action) {
        this._super(
            _.extend({
                network_update_period: 40,
                size: [ 20, 25 ],
                rotation_per_second: 2.5,
                thrust_accel:  325,
                reverse_accel: 325,
                max_speed: 225,
                bounce: 0.8,
                reload_delay: 250
            }, options),
            _.extend({
            }, state),
            _.extend({
                thrust: 0,
                rotate: 0,
                fire: false
            }, action)
        );
    },

    update: function (time, delta) {
        var a = this.action;

        this.state.rotation = a.rotate * 
            ( this.options.rotation_per_second / 1000 );

        var accel;
        if (a.thrust > 0) { 
            accel = delta * ( this.options.thrust_accel / 1000 ); 
        } else if (a.thrust < 0) { 
            accel = 0 - (delta * ( this.options.reverse_accel / 1000 )); 
        } else {
            accel = 0;
        }
        this.state.acceleration = accel;

        this._super(time, delta);

        // Only the server gets to fire real bullets.
        if (this.world.isServer()) {
            if (a.fire && ((time-this.last_fired) >= this.options.reload_delay)) {
                this.last_fired = time;
                this.fireBullet(time, delta);
            }
        }

    },

    fireBullet: function (time, delta) {
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

    init: function (options, state, action) {
        this._super(
            _.extend({
                network_update_period: 500,
                size: [ 2.5, 2.5 ],
                max_speed: 325,
                acceleration: 0,
                time_to_live: 5000,
                bounce: 1,
                max_bounces: 2
            },options),
            _.extend({
                bounce_count: 0
            }, state),
            _.extend({
            })
        );
    },

    /** Launch as a projectile from an owner */
    launchFromOwner: function (owner) {
        this.options.owner_id = owner.options.id;

        // Adopt owner's angle
        var max_speed = this.options.max_speed;
        var angle = owner.state.angle;
        this.state.angle = angle;

        // Spawn forward of the owner
        this.state.position = [ 
            Math.min(owner.world.options.width, Math.max(0, 
                owner.state.position[0] + 
                Math.cos(angle-Math.PI/2) * owner.options.size[0] * 0.5)),
            Math.min(owner.world.options.height, Math.max(0, 
                owner.state.position[1] + 
                Math.sin(angle-Math.PI/2) * owner.options.size[1] * 0.5))
        ];

        // Adopt the owner's velocity plus bullet's own speed along angle
        this.state.velocity = [
            Math.cos(angle-Math.PI/2) * (max_speed) + owner.state.velocity[0],
            Math.sin(angle-Math.PI/2) * (max_speed) + owner.state.velocity[1]
        ];
    },

    /** */
    onBounce: function (time, delta) {
        if (++this.state.bounce_count > this.options.max_bounces) {
            this.destroy();
        }
    },

    /** Handle a collision */
    handleCollisionWith: function(time, delta, other_entity) {
        // Ignore collisions with owner.
        if (other_entity.options.id == this.options.owner_id) { return; }

        this.destroy();
    }

});

// Export for CommonJS / node.js
try { 
    global.WebTrek.Game.Entity.Bullet = 
        WebTrek.Game.Entity.Bullet; 
} catch(e) { }
