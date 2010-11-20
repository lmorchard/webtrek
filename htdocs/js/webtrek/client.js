/**
 * Main driver for webtrek
 */
WebTrek.Client = Class.extend(function() {

    var OPS = WebTrek.Network.OPS;
    var match = Match;
    var _a = match.incl;
    var vmath = WebTrek.Math;
    
    return {

        init: function (options) {
            this.options = _.extend({
                document: null,
                socket: null,
                debug: true,
                ping_period: 500,
                max_pings: 10,
                world_size: [ 1500, 1500 ]
            }, options);

            var $this = this;

            this.last_ping_time = (new Date()).getTime();
            this.pings = [];

            this.hub = new WebTrek.Utils.PubSub();
            this.connected = false;

            var socket = this.options.socket;
            if (!socket) {
                socket = new io.Socket(null, { 
                    // rememberTransport: false,
                });
            }
            this.socket = new WebTrek.Network.QueuedMessageSocket(socket);

            $this.setWorld(
                new WebTrek.Game.World({
                    width:  this.options.world_size[0],
                    height: this.options.world_size[1],
                    is_server: false
                })
            );

            var document = $this.options.document;
            if (document) {

                $this.viewport = new WebTrek.Client.Viewport({
                    canvas: document.getElementById("display"),
                    world: $this.world,
                    fullscreen: true,
                    camera_center: [ 
                        $this.world.options.width / 2, 
                        $this.world.options.height / 2
                    ], 
                    hud_elements: {
                        reticule: new WebTrek.Client.Hud.Reticule({ })
                    }
                });

                var KEYS = WebTrek.Client.Input.Keyboard.KEYS;
                $this.keyboard = new WebTrek.Client.Input.Keyboard({
                    target: document,
                    bindings: {
                        'thrust': KEYS.up,
                        'reverse': KEYS.down,
                        'rotate_left': KEYS.left,
                        'rotate_right': KEYS.right,
                        'fire': KEYS.space
                    }
                });

            }

            if ($this.viewport) {
                
                $this.viewport.addHudElement(
                    'fps', new WebTrek.Client.Hud.FPS({ })
                );

                $this.viewport.addHudElement(
                    'input_state', 
                    new WebTrek.Client.Hud.InputState({ 
                        keyboard: $this.keyboard
                    })
                );

                $this.viewport.addHudElement(
                    'netstat',
                    new WebTrek.Client.Hud.Netstat({ client: $this })
                );

            }

            this.loop = new WebTrek.Game.Loop();
            this.loop.hub.subscribe('tick', 
                _(this.onLoopTick).bind(this));
            this.loop.hub.subscribe('done',
                _(this.onLoopDone).bind(this));
        },

        onLoopTick: function (time, delta) {
            this.handleMessages();
            this.world.update(time, delta);
        },

        onLoopDone: function (time, delta, remainder) {
            if (this.viewport) {
                this.viewport.update(time, delta, remainder);
            }
            var now = (new Date()).getTime();
            if (now - this.last_ping_time > this.options.ping_period) {
                this.last_ping_time = now;
                this.send(OPS.PING);
            }
            this.socket.flush();
        },

        setWorld: function (world) {
            this.world = world;
        },

        log: function (msg) {
            console.log(msg);
        },

        debug: function (msg) {
            console.log('DEBUG: '+msg);
        },

        start: function () {
            var $this = this;

            $this.loop.start();

            $this.connect();

            return this;
        },

        connect: function (options) {
            var $this = this, 
                socket = this.socket;
            socket.hub.subscribe('connect',
                _(this.handleConnect).bind(this));
            socket.hub.subscribe('disconnect',
                _(this.handleDisconnect).bind(this));
            socket.connect();
            return socket;
        },

        send: function (op, params) {
            var now = new Date().getTime();
            return this.socket.send([op, now, params]);
        },

        updateEntities: function (tick, data_set) {
            for (var i=0, data; data=data_set[i]; i++) {
                var entity = this.world.entities[data[0]];
                if (!entity) { continue; }
                entity.applyRemoteUpdate(tick, data);
            }
        },

        handleConnect: function () {
            this.connected = true;
            this.send(OPS.HELLO);
        },

        handleDisconnect: function () {
            this.connected = false;
            this.loop.kill();
            setTimeout(function () {
                window.location.reload();
            }, 1000);
        },

        handleMessages: function () {
            var msgs = this.socket.acceptMessages();
            while (msgs.length) {
                this.handleMessage(msgs.shift());
            }
        },

        handleMessage: function (msg) {

            var $this = this,
                now = new Date().getTime(),
                op = msg[0],
                msg_time = msg[1],
                args = msg[2];

            switch (op) {

                case OPS.HELLO:
                    this.connected = true;
                    this.client_id = args.client_id;
                    this.send(OPS.WANT_SNAPSHOT);
                    this.send(OPS.WANT_PLAYER_JOIN);
                    break;
                
                case OPS.PING:
                    this.send(OPS.PONG, this.loop.tick); 
                    break;

                case OPS.PONG:
                    var latency = now - this.last_ping_time;
                    this.pings.push(latency);
                    if (this.pings.length > this.options.max_pings) {
                        this.pings.shift();
                    }
                    break;
                
                case OPS.SNAPSHOT:
                    this.loop.tick = args.tick;
                    this.world.updateFromSnapshot(args.world);
                    break;

                case OPS.ENTITY_NEW:
                    var entity = WebTrek.Game.Entity.deserialize(args);
                    this.world.addEntity(entity);
                    break;

                case OPS.ENTITY_UPDATE:
                    this.updateEntities(args[0], args[1]);
                    break;

                case OPS.ENTITY_REMOVE:
                    this.world.removeEntity(args);
                    break;

                case OPS.PLAYER_NEW:
                    args.world = this.world;
                    var new_player = new WebTrek.Game.Player(args);
                    this.world.addPlayer(new_player);
                    break;

                case OPS.PLAYER_REMOVE:
                    this.world.removePlayer(args);
                    break;

                case OPS.PLAYER_YOU:
                    this.player = this.world.findPlayer(args);
                    this.player.client = this;
                    this.player.avatar.is_client = true;
                    this.player.keyboard = this.keyboard;
                    if (this.viewport) {
                        this.viewport.startTracking(this.player.avatar);
                    }
                    break;

                case OPS.WHAT:
                    // Ignoring, but should do something here.
                    break;

                default:
                    this.send(OPS.WHAT);
                    break;

            }
        },

        EOF:null

    };
}());
