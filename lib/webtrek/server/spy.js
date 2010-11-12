/**
 * Game server spy, performs inspection of various bits of game state.
 */
var util      = require('util'),
    http      = require('http'),
    socket_io = require('socket.io'),
    connect   = require('connect'),
    express   = require('express');

// Shared with the browser client, load straight to globals
require('underscore');
require('webtrek');

var WebTrek_Server = require('webtrek/server');

/**
 * Game server spy class.
 */
var WebTrek_Server_Spy = Class.extend({

    last_log: 0,

    init: function (options) {
        this.options = _.extend({
            world: null,
            update_period: 1000
        }, options);

        this.world = this.options.world;
    },

    update: function (time, delta) {
        var $this = this;

        if ( (time - this.last_log) > this.options.update_period ) {
            this.last_log = time;
            $this.emitLog(time, delta);
        }
    },

    emitLog: function (time, delta) {
        var $this = this;
        // util.log('Game loop time = ' + time);
    },

    EOF:null

});

try {
    exports.Spy = WebTrek_Server_Spy;
} catch (e) { }
