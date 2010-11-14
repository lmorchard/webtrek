/**
 * General utilities
 */
WebTrek.Utils = {};

/**
 * Publish/subscribe messaging utility
 */
WebTrek.Utils.PubSub = Class.extend({

    init: function (options) {
        this.subs = {};
    },

    subscribe: function (topic, handler) {
        if (!this.subs[topic]) {
            this.subs[topic] = [];
        }
        this.subs[topic].push(handler);
        return [topic,handler];
    },

    publish: function () {
        var args = _(arguments),
            handlers = this.subs[args.first()];
        if (handlers) {
            var params = args.rest();
            for (var i=0, handler; handler=handlers[i]; i++) {
                handler.apply(null, params);
            }
        }
    },

    unsubscribe: function (handle) {
        this.subs[handle[0]] = 
            _(this.subs[handle[0]]).without(handle[1]);
    }

});
