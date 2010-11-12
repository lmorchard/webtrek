#!/usr/bin/env node
/**
 * Playing with node.js hooray
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

    var game_server = new webtrek.Server({ 
    });
    game_server.start();

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
        app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
    });

    app.configure('production', function(){
        app.use(express.errorHandler());
    });
    
    /*
    app.get('/', function (req, res) {
        res.send('HI THERE');
    });
    */

    app.listen(3000);

    var socket = socket_io.listen(app);
    socket.on('connection', function (client) {
        
        client.send("HELLO SAILOR");

        client.on('message', function (msg) {
            util.log("MESSAGE "+ msg)
        });
        
        client.on('disconnect', function () {
            util.log("DISCONNECTED");
        });

        (function () {
            var cnt = 0;
            var timer = setInterval(function () {
                client.send("COUNT " + cnt);
                if (cnt++ >= 100) { 
                    client.send("Okay, done counting");
                    clearInterval(timer);
                }
            }, 10);
        })();

    });
}


main();
