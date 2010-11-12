/**
 * Player class
 */
WebTrek.Game.Player = Class.extend({

    id: null,

    init: function (options) {
        this.options = _.extend({
            keyboard: null,
            avatar: null,
            active: true,
            score: 0
        }, options);

        this.avatar = this.options.avatar;
        this.keyboard = this.options.keyboard;
    },

    update: function (world, tick, delta) {
        
        if (this.keyboard) {
            var k = this.keyboard;
                action = {
                    thrust: 0,
                    rotate: 0,
                    fire: false
                };

            if (k.on('thrust')) { action.thrust = 1; }
            if (k.on('reverse')) { action.thrust = -1; }
            if (k.on('fire')) { action.fire = true; }
            if (k.on('rotate_left')) { action.rotate = -1; }
            if (k.on('rotate_right')) { action.rotate = 1; }

            this.avatar.setAction(action);
        }

    },

    EOF: null
});
