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
                world_size: [ 1500, 1500 ]
            }, options);

            var $this = this;

            this.stats = {
                net: {
                    in:  { messages: 0, bytes: 0, last: null },
                    out: { messages: 0, bytes: 0, last: null },
                }
            };

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
            socket.on('connect', function () {
                $this.connected = true;
                $this.send(OPS.HELLO);
            });
            socket.on('disconnect',
                _(this.handleDisconnect).bind(this));
            socket.on('message',
                _(this.handleMessage).bind(this));
            socket.connect();
            return socket;
        },

        sendRaw: function (data) {
            var msg = JSON.stringify(data),
                now = new Date().getTime();

            this.stats.net.out.last = now;
            this.stats.net.out.messages++;
            this.stats.net.out.bytes += msg.length;

            this.socket.send(msg);
            return this;
        },

        send: function (op, params) {
            return this.sendRaw([op, (new Date().getTime()), params]);
        },

        handleConnect: function () {
        },

        handleDisconnect: function () {
        },

        updateEntity: function (data) {
            var entity = this.world.findEntity(data.id);
            if (!entity) { 
                // We're missing an entity, so get a snapshot.
                this.send(OPS.WANT_SNAPSHOT);
            } else {

                if (data.position) {

                    var x_diff = Math.abs(entity.position[0] - data.position[0]) ,
                        y_diff = Math.abs(entity.position[1] - data.position[1]);

                    if (x_diff > 4 || y_diff > 4) {
                        entity.position = data.position;
                    } else if (x_diff > 0.01 || y_diff > 0.01) {
                        entity.position = vector_add(
                            entity.position, 
                            vmath.vector_div(
                                vmath.vector_sub(data.position, entity.position), 
                                10
                            )
                        );
                    }

                    delete data.position;
                }

                for (var name in data) {
                    entity[name] = data[name];
                }
            }
        },

        handleMessage: function (msg) {
            var $this = this,
                data = JSON.parse(msg),
                now = new Date().getTime();

            this.stats.net.in.last = now;
            this.stats.net.in.messages++;
            this.stats.net.in.bytes += msg.length;
            this.stats.net.in.latency = now - data[1];
                
            match(
                
                [ OPS.HELLO, Number, Object ],
                function (time, args) { 
                    $this.connected = true;
                    $this.client_id = args.client_id;
                    $this.send(OPS.WANT_SNAPSHOT);
                    $this.send(OPS.WANT_PLAYER_JOIN);
                },
                
                [ OPS.PING, Number ], 
                function () { $this.send(OPS.PONG); },
                
                [ OPS.SNAPSHOT, Number, Object ], 
                function (time, snapshot) { 
                    $this.loop.tick = snapshot.tick;
                    $this.world.addSerializedEntities(snapshot.world.entities);
                },

                [ OPS.ENTITY_NEW, Number, Object ],
                function (time, entity_data) {
                    $this.world.deserializeEntity(entity_data);
                },

                [ OPS.ENTITY_UPDATE, Number, Object ],
                function (time, entity_data) {
                    $this.updateEntity(entity_data);
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
