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
                world_size: [ 1500, 1500 ]
            }, options);

            var $this = this;

            this.stats = {
                net: {
                    ping:  { last_time: 0, last_response: 0, latency: 0 },
                    t_in:  { messages: 0, bytes: 0, last: null },
                    t_out: { messages: 0, bytes: 0, last: null }
                }
            };
            this.last_ping_time = (new Date()).getTime();

            this.hub = new WebTrek.Utils.PubSub();
            this.socket = this.options.socket;
            this.connected = false;

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
                    new WebTrek.Client.Hud.Netstat({
                        stats: $this.stats.net
                    })
                );

                /*
                $this.viewport.addHudElement(
                    'avatar_state', 
                    new WebTrek.Client.Hud.AvatarState({ 
                        avatar: $this.player.avatar
                    })
                );
                */
            }

            $this.loop = new WebTrek.Game.Loop();
            
            $this.loop.hub.subscribe('tick', function (time, delta) {
                $this.world.update(time, delta);
            });

            $this.loop.hub.subscribe('done', function (time, delta, remainder) {
            
                if ($this.viewport) {
                    $this.viewport.update(time, delta, remainder);
                }

                var now = (new Date()).getTime();
                if (now - $this.stats.net.ping.last_time > $this.options.ping_period) {
                    $this.send(OPS.PING);
                    $this.stats.net.ping.last_time = now;
                }

            });

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
            if (!this.socket) {
                this.socket = new io.Socket(null, { 
                    // rememberTransport: false,
                });
            }
            var $this = this, 
                socket = this.socket;
            socket.on('connect',
                _(this.handleConnect).bind(this));
            socket.on('disconnect',
                _(this.handleDisconnect).bind(this));
            socket.on('message',
                _(this.handleMessage).bind(this));
            socket.connect();
            this.connected = true;
            return socket;
        },

        sendRaw: function (data) {
            var msg = JSON.stringify(data),
                now = new Date().getTime();

            this.socket.send(msg);

            this.stats.net.t_out.last = now;
            this.stats.net.t_out.messages++;
            this.stats.net.t_out.bytes += msg.length;

            return this;
        },

        send: function (op, params) {
            var now = new Date().getTime();
            return this.sendRaw([op, now, params]);
        },

        updateEntities: function (data_set) {
            for (var i=0, data; data=data_set[i]; i++) {
                var entity = this.world.entities[data[0]];
                if (!entity) { continue; }
                this.updateEntity(entity, data);
            }
        },

        updateEntity: function (entity, data) {
            var action_update = data[2];
            for (var id in action_update) {
                entity.action[id] = action_update[id];
            }

            var state_update = data[1];

            /*
            if (state_update.position) {

                var x_diff = Math.abs(entity.state.position[0] - 
                        state_update.position[0]) ,
                    y_diff = Math.abs(entity.state.position[1] - 
                        state_update.position[1]);

                if (x_diff > 2 || y_diff > 2) {
                    entity.state.position = state_update.position;
                } else if (x_diff > 0.01 || y_diff > 0.01) {
                    entity.state.position = vmath.vector_add(
                        entity.state.position, 
                        vmath.vector_div(
                            vmath.vector_sub(state_update.position, 
                                entity.state.position), 
                            10)
                        );
                }

                delete state_update.position;
            }
            */

            for (var id in state_update) {
                entity.state[id] = state_update[id];
            }
        },

        handleConnect: function () {
            this.connected = true;
            this.send(OPS.HELLO);
        },

        handleDisconnect: function () {
        },

        handleMessage: function (msg) {
            var $this = this,
                data = JSON.parse(msg),
                now = new Date().getTime();

            this.stats.net.t_in.last = now;
            this.stats.net.t_in.messages++;
            this.stats.net.t_in.bytes += msg.length;
            this.stats.net.t_in.latency = now - data[1];
                
            match(
                
                [ OPS.HELLO, Number, Object ],
                function (time, args) { 
                    $this.connected = true;
                    $this.client_id = args.client_id;
                    $this.send(OPS.WANT_SNAPSHOT);
                    $this.send(OPS.WANT_PLAYER_JOIN);
                },
                
                [ OPS.PING, Number ], 
                function () { 
                    $this.send(OPS.PONG, $this.loop.tick); 
                },

                [ OPS.PONG, Number, Number ], 
                function (time, s_tick) { 
                    var now = (new Date()).getTime();
                    $this.stats.net.ping.last_response = now;
                    $this.stats.net.ping.latency =
                        now - $this.stats.net.ping.last_time;
                    $this.stats.net.remote_tick = s_tick;
                },
                
                [ OPS.SNAPSHOT, Number, Object ], 
                function (time, snapshot) { 
                    $this.loop.tick = snapshot.tick;
                    $this.world.updateFromSnapshot(snapshot.world);
                },

                [ OPS.ENTITY_NEW, Number, Array ],
                function (time, s) {
                    $this.world.addEntity(WebTrek.Game.Entity.deserialize(s));
                },

                [ OPS.ENTITY_UPDATE, Number, Array ],
                function (time, data) {
                    $this.updateEntities(data);
                },

                [ OPS.ENTITY_REMOVE, Number, Number ],
                function (time, entity_id) {
                    $this.world.removeEntity(entity_id);
                },

                [ OPS.PLAYER_NEW, Number, Object ],
                function (time, player_data) {
                    player_data.world = $this.world;
                    var new_player = new WebTrek.Game.Player(player_data);
                    $this.world.addPlayer(new_player);
                },

                [ OPS.PLAYER_REMOVE, Number, Number ],
                function (time, player_id) {
                    $this.world.removePlayer(player_id);
                },

                [ OPS.PLAYER_YOU, Number, Number ],
                function (time, player_id) {
                    $this.player = $this.world.findPlayer(player_id);
                    $this.player.client = $this;
                    $this.player.keyboard = $this.keyboard;
                    if ($this.viewport) {
                        $this.viewport.startTracking($this.player.avatar);
                    }
                },

                [ OPS.WHAT ],
                function () {
                    // Ignoring, but should do something here.
                },

                /* default */
                function () { $this.send(OPS.WHAT); }

            )(data);
        },

        EOF:null

    };
}());
