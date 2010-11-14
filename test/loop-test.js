/**
 * Test the loop
 */
require.paths.unshift(__dirname + '/../deps')
require.paths.unshift(__dirname + '/../htdocs/js')
require.paths.unshift(__dirname + '/../lib')

var util   = require('util'),
    events = require('events'),
    nodeunit = require('nodeunit'),
    assert = require('assert');

require('underscore');
require('class');
require('webtrek');
require('webtrek/utils');
require('webtrek/game');
require('webtrek/game/world');
require('webtrek/game/loop');

module.exports = nodeunit.testCase({

    "Loop should allow for a limited run time": function (test) {
        var loop = new WebTrek.Game.Loop({
            interval_delay: 10,
            tick_duration: 10
        });
        loop.hub.subscribe('kill', function () { 
            test.ok(loop.tick >= 1000 - loop.options.tick_duration,
                "Loop should run up to at least the last tick");
            test.ok(loop.tick <= 1000,
                "Loop should not run over the last tick");
            test.done();
        });
        loop.start(0, 1000);
    }

});
