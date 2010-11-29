/**
 * Test networking
 */
require.paths.unshift(__dirname + '/../deps')
require.paths.unshift(__dirname + '/../htdocs/js')
require.paths.unshift(__dirname + '/../lib')

var io = require('socket.io'),
    util = require('util'),
    events = require('events'),
    assert = require('assert'),
    webtrek = require('webtrek/server'),
    nodeunit = require('nodeunit');

// This global is intentional
Match = require('match').Match;

require('underscore');
require('class');
require('match');
require('webtrek');
require('webtrek/utils');
require('webtrek/math');
require('webtrek/client');
require('webtrek/network');
require('webtrek/game');
require('webtrek/game/world');
require('webtrek/game/player');
require('webtrek/game/entity');
require('webtrek/game/loop');

var OPS = WebTrek.Network.OPS;
var OPS_NAMES = WebTrek.Network.OPS_NAMES;

module.exports = nodeunit.testCase({

    "Initial player join conversation": function (test) {
        var $this = this;

        var client_id, msg;

        var listener = new Mock_Socket({ tag: 'LISTEN' });
        var server = new webtrek.Server({ listener: listener });

        for (var i=1; i<=5; i++) {
            server.world.addEntity(
                new WebTrek.Game.Entity.Avatar({
                    position: [ 100 * i, 50 * i ],
                    velocity: [ 0,0],
                    rotation: [ 0 ]
                })
            );
        }

        var script = new ClientScript({ 
            test: test, 
            server: server,
            listener: listener 
        });

        script.start().send(OPS.HELLO);
        msg = script.expect(OPS.HELLO);
        test.ok(typeof(msg[2].client_id) != 'undefined',
            'welcome packet should come with a client ID');

        client_id = msg[2].client_id;

        // Say something stupid...
        script.send('MAKE-ME-A-SANDWICH');
        msg = script.expect(OPS.WHAT);

        // A PING should work and get a PONG in response.
        script.send(OPS.PING);
        msg = script.expect(OPS.PONG);

        // Down to business: ask for a snapshot
        script.send(OPS.WANT_SNAPSHOT);
        msg = script.expect(OPS.SNAPSHOT);

        var snapshot = msg[2];
        test.ok(typeof(snapshot.tick) != 'undefined');
        test.ok(typeof(snapshot.world) != 'undefined');
        test.ok(typeof(snapshot.world.entities) != 'undefined');

        var result = _(snapshot.world.entities).chain(),
            expect = _(server.world.buildSnapshot().entities).chain();

        // Only checking a select few attributes, maybe need more?
        _([ [[2], 'position'], [[0],'entity_type'], [[1],'size']]).each(function (n) {
            test.deepEqual(
                result.pluck(n[0]).pluck(n[1]).value(), 
                expect.pluck(n[0]).pluck(n[1]).value()
            );
        });

        script.send(OPS.WANT_PLAYER_JOIN).flush().tick();

        msg = script.expect(OPS.ENTITY_NEW);
        var avatar_id = msg[2][1].id;

        msg = script.expect(OPS.PLAYER_NEW);
        test.equal(msg[2].avatar_id, avatar_id);
        var player_id = msg[2].id;
        
        msg = script.expect(OPS.PLAYER_YOU);
        test.equal(msg[2], player_id);

        return test.done();
    },

    "Basic client to server connection": function (test) {
        var $this = this;

        var max_tick = 400;

        var s_listener = new Mock_Socket({ 
            tag: 'S (listen)'
        });
        var server = new webtrek.Server({ 
            listener: s_listener,
            update_period: 100
        });
        var client = new WebTrek.Client({ 
            document: null, 
            socket: new Mock_Socket({ 
                listener: s_listener,
                tag: 'C'
            }) 
        });

        for (var i=1; i<=5; i++) {
            server.world.addEntity(
                new WebTrek.Game.Entity.Avatar( {}, {
                    position: [ 100 * i, 50 * i ],
                    velocity: [ 10, 10 ],
                    rotation: 1
                }, {
                    rotate: -1
                } )
            );
        }

        /*
        client.loop.hub.subscribe('kill', function () {
            test.done();
        });
        */
        server.loop.hub.subscribe('kill', function () {
            test.done();
        });

        server.loop.start(0, max_tick);
        client.loop.start(0, max_tick);

        client.connect();
    },

});

/***********************************************************************/

/**
 * This is a really quick & dirty socket.io mock
 */
var Mock_Socket = Class.extend({
    
    events: [ 'connection', 'connect', 'message', 'disconnect' ],
    clients: [],
    connected: false,

    init: function (options) {
        this.options = _.extend({
            connection: null,
            listener: null,
            tag: '...'
        }, options);

        this.listener = this.options.listener;
        this.connection = this.options.connection;
        
        this.subs = { };
        for (var i=0, name; name=this.events[i]; i++) {
            this.subs[name] = [];
            if (this.options['on'+name]) {
                this.on(name, this.options['on'+name]);
            }
        }
    },

    connect: function () {
        if (this.listener) {
            this.listener.connectClient(this);
        }
    },

    send: function (msg) {
        if (this.connection) {
            if (false) util.debug(this.options.tag + ': ' + 
                util.inspect(JSON.parse(msg), false, 8));
            this.connection.fire('message', msg); 
        }
    },

    on: function (event, cb) { 
        this.subs[event].push(cb); 
    },

    fire: function (event, msg) {
        var cbs = this.subs[event];
        for (var i=0,cb; cb=cbs[i]; i++) { cb(msg); }
    },

    broadcast: function (msg) {
        for (var i=0,sock; sock=this.clients[i]; i++) {
            sock.send(msg);
        }
    },

    connectClient: function (c_sock) {
        var s_sock = new Mock_Socket({ tag: 'S' });
        
        c_sock.connection = s_sock;
        s_sock.connection = c_sock;

        this.clients.push(s_sock);

        this.fire('connection', s_sock);
        c_sock.fire('connect');

        return c_sock;
    }

});

var ClientScript = Class.extend({

    init: function (options) {
        this.options = _.extend({
            steps: [],
            test: null,
            server: null,
            listener: null,
            timeout: 100,
            tick_start: 100,
            tick_delta: 17
        }, options);

        this.c_tick = 0;
        this.messages = [];
        this.timeout_timer = null;
        this.failed = false;
        this.server = this.options.server;
    },

    start: function () {
        var $this = this;
        var raw_socket = new Mock_Socket({ tag: 'C' });
        this.socket = new WebTrek.Network.QueuedMessageSocket(raw_socket);

        this.server.loop.reset(this.options.tick_start);
        this.options.listener.connectClient(raw_socket);
        this.tick();

        return this;
    },

    recv: function () {
        var new_msgs = this.socket.acceptMessages();
        this.messages.push.apply(this.messages, new_msgs);
        return this.messages.shift();
    },

    send: function (op, params) {
        this.socket.send([op, this.getTick(), params]);
        return this;
    },

    flush: function () {
        this.socket.flush();
        return this;
    },

    getTick: function () {
        return this.options.tick_start + 
            ( (this.c_tick) * this.options.tick_delta );
    },

    tick: function () {
        this.c_tick++;
        this.server.loop.tickOnce(this.getTick());
    },

    expect: function (op_type) {
        this.flush().tick();

        var test = this.options.test;
        var msg = this.recv();
        test.ok(msg, 
            'A message was expected, but none received');
        test.equal(msg.length, 3,
            'message should be an array, length 3;');
        test.equal(msg[0], op_type,
            'packet op type should be ' + OPS_NAMES[op_type]);
        return msg;
    }

});
