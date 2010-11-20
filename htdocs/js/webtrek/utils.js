/**
 * General utilities
 */
WebTrek.Utils = {};

WebTrek.Utils.avg = function (list) {
    return parseInt(
        _(list).reduce(function (sum,n) { 
            return sum+n; }, 
        0) / list.length, 
    10);
};

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

WebTrek.Utils.Vector = function(x, y) {
    var coords = (typeof y !== "undefined" && y !== null) ? 
        [x, y] : [Math.cos(x), Math.sin(x)];
    this.x = _d[0] || 0;
    this.y = _d[1] || 0;
    this._zeroSmall();
    return this;
};
WebTrek.Utils.Vector.prototype = {
    serialize: [
        'Vector', {
            allowNesting: true
        }
    ],
    _zeroSmall: function () {
        if (Math.abs(this.x) < 0.01) {
            this.x = 0;
        }
        if (Math.abs(this.y) < 0.01) {
            return (this.y = 0);
        }
    },
    plus: function (v) {
        return new Vector(this.x + v.x, this.y + v.y);
    },
    minus: function (v) {
        return new Vector(this.x - v.x, this.y - v.y);
    },
    times: function (s) {
        return new Vector(this.x * s, this.y * s);
    },
    length: function () {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    },
    normalized: function () {
        return this.times(1.0 / this.length());
    },
    clone: function () {
        return new Vector(this.x, this.y);
    }
};
