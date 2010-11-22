/**
 * Shared networking constants and routines.
 */
WebTrek.Network = (function () {
    var $this = {

        OPS: {},
        OPS_NAMES: [
            'HELLO', 'BYE', 'PING', 'PONG', 
            'WANT_SNAPSHOT', 'SNAPSHOT',
            'WANT_PLAYER_JOIN', 'PLAYER_YOU', 'ERR_ALREADY_PLAYER',
            'PLAYER_NEW', 'PLAYER_ACTION', 'PLAYER_UPDATE', 'PLAYER_REMOVE',
            'ENTITY_NEW', 'ENTITY_UPDATE', 'ENTITY_REMOVE', 
            'ERROR', 'WHAT'
        ],

        init: function () {
            for (var i=0,name; name=this.OPS_NAMES[i]; i++) {
                this.OPS[name] = i;
            }
            return $this;
        },
        EOF:null
    };
    return $this.init();
})();

WebTrek.Network.QueuedMessageSocket = Class.extend({

    init: function (socket) {
        this.socket = socket;
        this.connected = false;
        this.msgs_in = [];
        this.msgs_out = [];

        this.hub = new WebTrek.Utils.PubSub();

        this.stats = {
            input:  { packets: 0, messages: 0, bytes: 0, last: null },
            output: { packets: 0, messages: 0, bytes: 0, last: null }
        };

        socket.on('connect', 
            _(this.handleConnect).bind(this));
        socket.on('message', 
            _(this.handleMessage).bind(this));
        socket.on('disconnect', 
            _(this.handleDisconnect).bind(this));
    },

    connect: function () {
        return this.socket.connect();
    },

    handleConnect: function () {
        this.connected = true;
        this.hub.publish('connect');
    },
    
    handleDisconnect: function () {
        this.connected = false;
        this.hub.publish('disconnect');
    },
    
    acceptMessages: function () {
        var out = this.msgs_in;
        this.msgs_in = [];
        return out;
    },
    
    send: function (msg) {
        this.msgs_out.push(msg);
    },
    
    handleMessage: function (data) {
        var msgs = JSON.parse(data),
        // var msgs = BISON.decode(data),
            st = this.stats.input;

        st.packets++;
        st.messages += msgs.length;
        st.bytes += data.length;
        st.last = (new Date()).getTime();

        this.msgs_in.push.apply(this.msgs_in, msgs);
    },
    
    flush: function () {
        if (0 == this.msgs_out.length) { return; }

        var data = JSON.stringify(this.msgs_out),
        // var data = BISON.encode(this.msgs_out),
            st = this.stats.output;

        st.packets++;
        st.messages += this.msgs_out.length;
        st.bytes += data.length;
        st.last = (new Date()).getTime();

        this.socket.send(data);
        this.msgs_out = [];
    }

});

try {
    global.WebTrek.Network = WebTrek.Network;
} catch (e) { }
