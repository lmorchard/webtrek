/**
 * Shared networking constants and routines.
 */
WebTrek.Network = (function () {

    var $this = {

        PACKET_OPS: 242,


        init: function () {

            return $this;
        },

        EOF:null
    };

    return $this.init();
})();

try {
    global.WebTrek.Network = WebTrek.Network;
} catch (e) { }
