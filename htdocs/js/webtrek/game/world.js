/**
 * Game world
 */
WebTrek.Game.World = function (options) {
    return this.__construct(options); 
};
(function () {

WebTrek.Game.World.prototype = {

    __construct: function (options) {
        this.options = _.extend({
        }, options);
    },

    update: function (tick, duration) {
        
    },

    EOF:null
};

})();
