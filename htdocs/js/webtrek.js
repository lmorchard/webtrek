/**
 * Webtrek base package
 */
WebTrek = ( function () {

    var $this = {
        hello: 'world',

        init: function () {
            return $this;
        },

        EOF:null
    };

    return $this.init();
})();

// Export for CommonJS / node.js
try {
    globals.WebTrek = WebTrek;
} catch(e) { }
