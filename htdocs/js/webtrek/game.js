/**
 * Webtrek base game package
 */
WebTrek.Game = ( function () {

    var $this = {

        init: function () {
            return $this;
        },

        EOF:null
    };

    return $this.init();
})();

// Export for CommonJS / node.js
try {
    globals.WebTrek.Game = WebTrek.Game;
} catch(e) { }
