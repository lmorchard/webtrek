/**
 * Game server for node.js
 */
var sys       = require('sys'),
    path      = require('path'),
    fs        = require('fs'),
    util      = require('util'),
    http      = require('http'),
    socket_io = require('socket.io'),
    connect   = require('connect'),
    match     = require('match').Match,
    express   = require('express');

// Shared with the browser client, load straight to globals
BISON = require('bison');
require('underscore');
require('class');
require('webtrek');
require('webtrek/utils');
require('webtrek/network');
require('webtrek/game');
require('webtrek/game/world');
require('webtrek/game/player');
require('webtrek/game/entity');
require('webtrek/game/loop');

var _a = match.incl;

/**
 * Game server class
 */
var WebTrek_Server = Class.extend(function () {
    
    var OPS = WebTrek.Network.OPS;

    return {

        clients: {},
        
        init: function (options) {
            this.options = _.extend({
                debug: true,
                listener: null,
                spies: [],
                world_size: [ 1200, 1200 ],
                update_period: 50,
            }, options);

            var $this = this;

            this.hub = new WebTrek.Utils.PubSub();
            this.clients = {}; 
            this.listener = this.options.listener;

            if ($this.listener) {
                $this.listener.on('connection', function (client) {
                    $this.handleConnection(client);
                });
            }

            $this.setWorld(
                new WebTrek.Game.World({
                    width:  $this.options.world_size[0],
                    height: $this.options.world_size[1],
                    is_server: true
                })
            );

            $this.loop = new WebTrek.Game.Loop();

            this.last_update_tick = 0;

            $this.loop.hub.subscribe('tick', 
                _(this.onLoopTick).bind(this));
            this.loop.hub.subscribe('done',
                _(this.onLoopDone).bind(this));
        },

        onLoopTick: function (time, delta) {
            for (var id in this.clients) {
                this.clients[id].handleMessages(time, delta);
            }
            this.world.update(time, delta);
            for (var id in this.world.entities) {
                this.world.entities[id].sendRemoteUpdate(time, delta, this);
            }
        },

        onLoopDone: function (time, delta, remainder) {
            for (var id in this.clients) {
                this.clients[id].socket.flush();
            }
        },

        setWorld: function (world) {
            var $this = this;
            this.world = world;
            var subs = {
                'addEntity': function (entity) {
                    $this.broadcast(OPS.ENTITY_NEW, entity.serialize());
                },
                'removeEntity': function (entity) {
                    $this.broadcast(OPS.ENTITY_REMOVE, entity.options.id);
                },
                'addPlayer': function (player) {
                    $this.broadcast(OPS.PLAYER_NEW, player.serialize());
                },
                'removePlayer': function (player) {
                    $this.broadcast(OPS.PLAYER_REMOVE, player.id);
                },
            };
            for (var name in subs) {
                this.world.hub.subscribe(name, subs[name]);
            }

        },

        /** Start up the server */
        start: function () {
            var $this = this;
            $this.loop.start();
        },

        /** Broadcast a structured message packet to all clients */
        broadcast: function (op, params) {
            var now = new Date().getTime();
            this.hub.publish('broadcast', op, params);
            for (var id in this.clients) {
                var client = this.clients[id];
                if (!client.player && OPS.ENTITY_UPDATE == op) {
                    continue;
                }
                client.send(op,params);
            }
        },

        /** Spawn a new client connection */
        handleConnection: function (socket) {
            var new_client = new WebTrek_Server_Client({ 
                server: this, socket: socket 
            });
            this.clients[new_client.id] = new_client;
            this.hub.publish('clientConnected', new_client);
        },

        /** Prepare a snapshot of the server state */
        snapshot: function () {
            var out = {
                tick: this.loop.tick,
                world: this.world.buildSnapshot()
            };
            return out;
        },

        /** Spawn a player and associated avatar into the world. */
        joinPlayer: function () {
            var new_avatar = new WebTrek.Game.Entity.Avatar(
                { }, 
                { 
                    position: [
                        Math.random() * this.world.options.width,
                        Math.random() * this.world.options.height
                    ] 
                }, 
                { }
            );
            var new_player = new WebTrek.Game.Player({ 
                avatar: new_avatar 
            });
            this.world.addPlayer(new_player);
            return new_player;
        },

        EOF:null
    };

}());

/**
 * Game server client handler
 */
var WebTrek_Server_Client = Class.extend(function () {
    
    var OPS = WebTrek.Network.OPS;

    return {

        init: function (options) {
            this.options = _.extend({
                id: null,
                server: null,
                ping_period: 2000,
                socket: null
            }, options);

            var $this = this;

            this.stats = {
                net: {
                    ping: { last_time: 0, latency: 0 },
                    in:   { messages: 0, bytes: 0, last: null },
                    out:  { messages: 0, bytes: 0, last: null },
                }
            };

            this.hub = new WebTrek.Utils.PubSub();

            this.id = this.options.id || _.uniqueId();

            var socket = this.options.socket;
            if (!socket) {
                socket = new io.Socket(null, { 
                    // rememberTransport: false,
                });
            }
            this.socket = new WebTrek.Network.QueuedMessageSocket(socket);

            this.server = this.options.server;
            this.player = null;

            this.socket.hub.subscribe('disconnect',
                _(this.handleDisconnect).bind(this));

            this.ping_handle = this.server.loop.hub.subscribe('done', 
                function (time, delta, remainder) {
                    var now = (new Date()).getTime();
                    if (now - $this.stats.net.last_time > $this.options.ping_period) {
                        $this.send(OPS.PING);
                        $this.stats.net.last_time = now;
                    }
                }
            );

        },

        handleMessages: function (time, delta) {
            var msgs = this.socket.acceptMessages();
            for (var i=0,msg; msg=msgs[i]; i++) {
                this.handleMessage(time, delta, msg);
            }
        },

        handleMessage: function (time, delta, data) {
            var $this = this,
                now = new Date().getTime();

            match(
                
                [ OPS.HELLO ],
                function () { 
                    $this.connected = true;
                    $this.send(OPS.HELLO, { client_id: $this.id });
                },
                
                [ OPS.PING ], 
                function () { 
                    $this.send(OPS.PONG, $this.server.loop.tick); 
                },
                
                [ OPS.PONG, Number, Number ], 
                function (time, c_tick) { 
                    var now = (new Date()).getTime();
                    $this.stats.net.ping.last_response = now;
                    $this.stats.net.ping.latency =
                        now - $this.stats.net.ping.last_time;
                    $this.stats.net.remote_tick = c_tick;
                },
                
                [ OPS.WANT_SNAPSHOT ], 
                function () { 
                    $this.send(OPS.SNAPSHOT, $this.server.snapshot());
                },

                [ OPS.WANT_PLAYER_JOIN ],
                function () {
                    if ($this.player) {
                        $this.send(OPS.ERR_ALREADY_PLAYER);
                    } else {
                        var new_player = $this.server.joinPlayer();
                        $this.send(OPS.PLAYER_YOU, new_player.id);
                        $this.player = new_player;
                    }
                },

                [ OPS.PLAYER_ACTION, Number, Array ],
                function (time, data) {
                    var entity = $this.player.avatar,
                        remote_tick = data[0],
                        state = data[1],
                        action = data[2];
                    /*    
                    entity.applyRemoteUpdate(remote_tick, [
                        entity.id, {}, action
                    ]);
                    */
                    entity.state.angle = state.angle;
                    entity.setAction(action);
                },

                [ OPS.WHAT ],
                function () {
                    // Ignoring, but should do something here.
                },
                
                /* default */
                function () { $this.send(OPS.WHAT); }

            )(data);
        },

        handleDisconnect: function (msg) {
            this.server.loop.hub.unsubscribe(this.ping_handle);
            if (this.player) {
                this.player.destroy();
            }
        },

        send: function (op, params) {
            var now = this.server.loop.tick; // new Date().getTime();
            this.hub.publish('send', op, params);
            return this.socket.send([op, now, params]);
        },

        EOF:null
    }

}());

try {
    exports.Server = WebTrek_Server;
} catch (e) { }
