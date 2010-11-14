/**
 * Shared networking constants and routines.
 */
WebTrek.Network = (function () {

    var $this = {

        OPS: {},
        OPS_NAMES: [
            'HELLO', 'BYE',
            
            'PING', 'PONG', 
            
            'WANT_SNAPSHOT', 'SNAPSHOT',
            
            'WANT_PLAYER_JOIN', 'PLAYER_YOU', 'ERR_ALREADY_PLAYER',

            'PLAYER_NEW', 'PLAYER_ACTION', 'PLAYER_UPDATE', 'PLAYER_REMOVE',

            'ENTITY_NEW', 'ENTITY_UPDATE', 'ENTITY_REMOVE', 

            /*
                'PLAYER_CONNECT',
                'PLAYER_DISCONNECT',
                'CHAT_SAY',
                
            */
            'ERROR', 'WHAT'
        ],

        init: function () {
            for (var i=0,name; name=this.OPS_NAMES[i]; i++) {
                this.OPS[name] = name; //i;
            }
            return $this;
        },

        EOF:null
    };

    return $this.init();
})();

try {
    global.WebTrek.Network = WebTrek.Network;
} catch (e) { }
