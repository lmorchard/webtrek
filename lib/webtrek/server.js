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
    express   = require('express');

// Shared with the browser client, load straight to globals
require('underscore');
require('class');
require('webtrek');
require('webtrek/game');
require('webtrek/game/world');
require('webtrek/game/player');
require('webtrek/game/entity');
require('webtrek/game/loop');
require('webtrek/network');

var webtrek_spy = require('webtrek/server/spy');

/**
 * Game server class
 */
var WebTrek_Server = Class.extend({
    
    init: function (options) {
        this.options = _.extend({
            debug: true,
            world_size: [ 1500, 1500 ]
        }, options);
    },

    start: function () {
        var $this = this;

        $this.world = new WebTrek.Game.World({
            width:  this.options.world_size[0],
            height: this.options.world_size[1]
        });

        $this.player = new WebTrek.Game.Player({
            avatar: new WebTrek.Game.Entity.Avatar({
                position: [ 400, 400 ]
            })
        });

        $this.world.addPlayer($this.player);
        $this.world.addEntity($this.player.avatar);

        if ($this.options.debug) {
            for (var i=0; i<10; i++) {
                $this.world.addEntity(
                    new WebTrek.Game.Entity.Avatar({
                        position: [ 400*Math.random(), 400*Math.random() ],
                        velocity: [ 0.5*Math.random(), 0.5*Math.random() ],
                        rotation: [ 6*Math.random() ]
                    })
                );
            }
        }

        $this.spy = new webtrek_spy.Spy({
            world: $this.world
        });

        $this.loop = new WebTrek.Game.Loop({
            ontick: function (time, delta) {
                $this.world.update(time, delta);
                $this.spy.update(time, delta);
            },
            ondone: function (time, delta, remainder) {
            }
        });

        util.log("WebTrek game world created, event loop starting");
        $this.loop.start();
    }

});

try {
    exports.Server = WebTrek_Server;
} catch (e) { }
