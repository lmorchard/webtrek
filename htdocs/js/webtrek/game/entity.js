/**
 * Package for active game entities
 */
WebTrek.Game.Entity = {};

/**
 * Base class for active game entities
 */
WebTrek.Game.Entity.EntityBase = Class.extend({

    position: [ 0, 0 ],
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

/**
 * Avatar entity class
 */
WebTrek.Game.Entity.Avatar = WebTrek.Game.Entity.EntityBase.extend({

    view_class: (!WebTrek.Client) ? null : 
        WebTrek.Client.EntityView.AvatarView,

    init: function (options) {

        this._super(_.extend({
        
        },options));

    },

    update: function (world, time, delta) {


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

