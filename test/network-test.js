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
        return test.done();

        var listener = new Mock_Listener();
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

        server.loop.start(0, 1000);

        var client_id, msg;

        var script = new ClientScript({ test: test, listener: listener });
        script.start();

        script.send(OPS.HELLO);

        msg = script.expectMsg(OPS.HELLO);
        test.ok(typeof(msg[2].client_id) != 'undefined',
            'welcome packet should come with a client ID');

        client_id = msg[2].client_id;

        // Say something stupid...
        script.send('MAKE-ME-A-SANDWICH');
        msg = script.expectMsg(OPS.WHAT);

        // A PING should work and get a PONG in response.
        script.send(OPS.PING);
        msg = script.expectMsg(OPS.PONG);

        // Down to business: ask for a snapshot
        script.send(OPS.WANT_SNAPSHOT);
        msg = script.expectMsg(OPS.SNAPSHOT);

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

        script.send(OPS.WANT_PLAYER_JOIN);

        msg = script.expectMsg(OPS.ENTITY_NEW);
        var avatar_id = msg[2].id;

        msg = script.expectMsg(OPS.PLAYER_NEW);
        test.equal(msg[2].avatar_id, avatar_id);
        var player_id = msg[2].id;
        
        msg = script.expectMsg(OPS.PLAYER_YOU);
        test.equal(msg[2], player_id);

        return test.done();

    },

    "Basic client to server connection": function (test) {
        var $this = this;

        var max_tick = 400;

        var s_listener = new Mock_Listener({ 
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
            util.log(this.options.tag + ': ' + msg);
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

var Mock_Listener = Mock_Socket.extend({ });

var ClientScript = Class.extend({

    init: function (options) {
        this.options = _.extend({
            steps: [],
            test: null,
            listener: null,
            timeout: 100
        }, options);

        this.messages = [];
        this.timeout_timer = null;
        this.failed = false;
        this.steps = this.options.steps;
    },

    start: function () {
        var $this = this;
        this.socket = new Mock_Socket({
            onmessage: function (msg) {
                var data = JSON.parse(msg);
                $this.messages.push(data);
            } 
        });
        this.options.listener.connectClient(this.socket);
    },

    recv: function () {
        return this.messages.shift();
    },

    sendRaw: function (data) {
        this.socket.send(JSON.stringify(data));
    },

    send: function (op, params) {
        return this.sendRaw([op, (new Date().getTime()), params]);
    },

    expectMsg: function (op_type) {
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
