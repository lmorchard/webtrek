/**
 * Player class
 */
WebTrek.Game.Player = Class.extend(function () {
    var OPS = WebTrek.Network.OPS;

    return {

        init: function (options) {
            this.options = _.extend({
                id: null,
                world: null,
                client: null,
                keyboard: null,
                avatar: null,
                active: true,
                score: 0
            }, options);

            this.id = this.options.id;
            this.world = this.options.world;
            this.client = this.options.client;
            this.score = this.options.score;
            this.keyboard = this.options.keyboard;

            if (this.options.avatar_id && this.world) {
                this.avatar = this.world.entities[this.options.avatar_id];
            } else {
                this.avatar = this.options.avatar;
            }
        },

        serialize: function () {
            return {
                id: this.id,
                score: this.score,
                avatar_id: this.avatar.id
            };
        },

        update: function (tick, delta) {
            if (!this.keyboard || !this.avatar) { return; }

            var k = this.keyboard;
                action = {
                    thrust: 0,
                    rotate: 0,
                    fire: false
                };

            if (k.on('thrust')) { action.thrust = 1; }
            if (k.on('reverse')) { action.thrust = -1; }
            if (k.on('rotate_left')) { action.rotate = -1; }
            if (k.on('rotate_right')) { action.rotate = 1; }
            if (k.on('fire')) { action.fire = true; }

            var a_old = JSON.stringify(this.avatar.action),
                a_new = JSON.stringify(action);
            if (a_old != a_new) {
                this.client.send(OPS.PLAYER_ACTION, action);
            }
            this.avatar.setAction(action);
        },

        destroy: function () {
            if (this.avatar) {
                this.avatar.destroy();
            }
            this.world.removePlayer(this.id);
        },

        EOF: null
    };

}());
