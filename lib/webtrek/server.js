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

var webtrek_spy = require('webtrek/server/spy');

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
                world_size: [ 1500, 1500 ],
                update_period: 200,
            }, options);

            var $this = this;

            this.stats = {
                net: {
                    in:  { messages: 0, bytes: 0, last: null },
                    out: { messages: 0, bytes: 0, last: null },
                }
            };

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

            $this.loop.hub.subscribe('tick', function (time, delta) {
                $this.world.update(time, delta);
                // TODO: Make this more adaptive, send updates at a rate
                // relative to bandwidth
                if ( (time-$this.last_update_tick) > $this.options.update_period ) {
                    var entities = $this.world.entities;
                    for (var id in entities) {
                        $this.broadcast(OPS.ENTITY_UPDATE, entities[id].serialize());
                    }
                    $this.last_update_tick = time;
                }
            });

        },

        setWorld: function (world) {
            var $this = this;
            this.world = world;
            var subs = {
                'addEntity': function (entity) {
                    $this.broadcast(OPS.ENTITY_NEW, entity.serialize());
                },
                'updateEntity': function (entity) {
                    $this.broadcast(OPS.ENTITY_UPDATE, entity.serialize());
                },
                'removeEntity': function (entity) {
                    $this.broadcast(OPS.ENTITY_REMOVE, entity.id);
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

        /** Broadcast raw data to all clients */
        broadcastRaw: function (data) {
            var msg = JSON.stringify(data);
            this.listener.broadcast(msg);
            return this;
        },

        /** Broadcast a structured message packet to all clients */
        broadcast: function (op, params) {
            this.hub.publish('broadcast', op, params);
            return this.broadcastRaw([op, (new Date().getTime()), params]);
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
                world: this.world.serialize()
            };
            return out;
        },

        /** Spawn a player and associated avatar into the world. */
        joinPlayer: function () {
            var new_avatar = new WebTrek.Game.Entity.Avatar({ 
                position: [0, 0]
            });
            var new_player = new WebTrek.Game.Player({ avatar: new_avatar });
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
                socket: null
            }, options);

            this.hub = new WebTrek.Utils.PubSub();

            this.id = this.options.id || _.uniqueId();
            this.server = this.options.server;
            this.socket = this.options.socket;
            this.player = null;

            this.socket.on('message', 
                _(this.handleMessage).bind(this));
            this.socket.on('disconnect', 
                _(this.handleDisconnect).bind(this));
        },

        handleMessage: function (msg) {
            var $this = this,
                data = JSON.parse(msg),
                now = new Date().getTime();

            match(
                
                [ OPS.HELLO ],
                function () { 
                    $this.connected = true;
                    $this.send(OPS.HELLO, { client_id: $this.id });
                },
                
                [ OPS.PING ], 
                function () { $this.send(OPS.PONG); },
                
                [ OPS.WANT_SNAPSHOT ], 
                function () { 
                    $this.send(OPS.SNAPSHOT, $this.server.snapshot());
                },

                [ OPS.WANT_PLAYER_JOIN ],
                function () {
                    if ($this.player) {
                        $this.send(OPS.ERR_ALREADY_PLAYER);
                    } else {
                        $this.player = $this.server.joinPlayer();
                        $this.send(OPS.PLAYER_YOU, $this.player.id);
                    }
                },

                [ OPS.PLAYER_ACTION, Number, Object ],
                function (time, data) {
                    $this.player.avatar.setAction(data);
                    $this.server.broadcast(OPS.ENTITY_UPDATE, 
                        $this.player.avatar.serialize());
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
            if (this.player) {
                this.player.destroy();
            }
        },

        sendRaw: function (data) {
            var msg = JSON.stringify(data);
            this.socket.send(msg);
            return this;
        },

        send: function (op, params) {
            this.hub.publish('send', op, params);
            return this.sendRaw([op, (new Date().getTime()), params]);
        },

        EOF:null
    }

}());

try {
    exports.Server = WebTrek_Server;
} catch (e) { }
