#!/usr/bin/env node
/**
 * Fire up the server!
 */
require.paths.unshift(__dirname + '/../deps')
require.paths.unshift(__dirname + '/../htdocs/js')
require.paths.unshift(__dirname + '/../lib')

var sys       = require('sys'),
    path      = require('path'),
    fs        = require('fs'),
    util      = require('util'),
    http      = require('http'),
    socket_io = require('socket.io'),
    connect   = require('connect'),
    express   = require('express'),
    webtrek   = require('webtrek/server');

function main() {

    var app = express.createServer(
        express.logger(),
        express.bodyDecoder(),
        express.methodOverride(),
        express.cookieDecoder(),
        express.session()
    );

    app.configure('development', function(){
        app.use(express.repl())
        app.use(express.staticProvider(__dirname + '/../htdocs'))
        app.use(express.errorHandler({ 
            dumpExceptions: true, showStack: true 
        }));
    });

    app.configure('production', function(){
        app.use(express.errorHandler());
    });
    
    app.listen(3000);

    var socket = socket_io.listen(app);
    var game_server = new webtrek.Server({ 
        listener: socket
    });

    // TODO: Remove this!
    for (var i=1; i<=1; i++) {
        game_server.world.addEntity(
            new WebTrek.Game.Entity.Avatar(
                {},
                {
                    position: [ 100 * i, 50 * i ],
                    velocity: [ 10*i , 10*i ],
                    rotation: 1*i
                },
                { 
                    rotate: -1
                }
            )
        );
    }

    game_server.start();
}

main();
