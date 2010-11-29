/**
 * Main driver for webtrek
 */
WebTrek.Client = Class.extend(function() {

    var OPS = WebTrek.Network.OPS;
    var match = Match;
    var _a = match.incl;
    var vmath = WebTrek.Math;
    var avg = WebTrek.Utils.avg;
    
    return {

        init: function (options) {
            this.options = _.extend({
                document: null,
                socket: null,
                debug: true,
                ping_period: 500,
                max_pings: 10,
                world_size: [ 1500, 1500 ],
                min_ticks_ahead: 100,
                max_ticks_ahead: 300
            }, options);

            var $this = this;

            this.last_ping_time = 0;
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
            var now = time;
            if (now - this.last_ping_time > this.options.ping_period) {
                this.last_ping_time = now;
                this.send(OPS.PING, this.loop.tick);
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
            return this.socket.send([op, this.loop.tick, params]);
        },

        updateEntity: function (tick, data) {
            var entity = this.world.entities[data[0]];
            if (entity) { 
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
                now = this.loop.tick,
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
                    this.send(OPS.PONG, this.loop.tick); break;

                case OPS.PONG:
                    this.handlePong(args); break;
                
                case OPS.SNAPSHOT:
                    this.loop.tick = args.tick;
                    this.world.updateFromSnapshot(args.world);
                    break;

                case OPS.ENTITY_NEW:
                    var entity = WebTrek.Game.Entity.deserialize(args);
                    this.world.addEntity(entity);
                    if (this.loop.tick > msg_time) {
                        // Update the new entity into the client's predicted future
                        entity.update(msg_time, (this.loop.tick - msg_time) );
                    }
                    break;

                case OPS.ENTITY_UPDATE:
                    this.updateEntity(args[0], args[1]);
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

        /** 
         * Handle a pong response, adjust client loop clock to stay ahead of
         * server. 
         */
        handlePong: function (remote_tick) {

            var now = this.loop.tick,
                latency = now - this.last_ping_time,
                min_ticks_ahead = this.options.min_ticks_ahead,
                max_ticks_ahead = this.options.max_ticks_ahead;

            // Maintain window of ping latencies.
            this.pings.push(latency);
            if (this.pings.length > this.options.max_pings) {
                this.pings.shift();
            }

            var avg_lag = avg(this.pings),
                tick_delta = (this.loop.tick - remote_tick),
                adjust = 0;

            if (tick_delta < min_ticks_ahead) {
                // Client is not far enough ahead of server clock, so catch up
                var adjust = (avg(this.pings)/2) + (min_ticks_ahead-tick_delta);
                this.loop.accum += Math.max( 100, adjust );
            }
            if (tick_delta > max_ticks_ahead) {
                // Client is too far ahead of server, so hold up a bit
                var adjust = (avg(this.pings)/2) + (tick_delta-max_ticks_ahead);
                this.loop.accum -= Math.max( 100, adjust );
            }

        },

        EOF:null

    };
}());
