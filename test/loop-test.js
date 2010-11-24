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
    },

    "Loop should allow for direct drive from a non-timer": function (test) {
        var loop = new WebTrek.Game.Loop({
            interval_delay: 10,
            tick_duration: 10
        });
        
        var cnt = 0,
            tm_start = new Date().getTime(),
            tm_total = 0;

        loop.hub.subscribe('tick', function (tick, duration) {
            cnt++;
            tm_total += duration;
        });
        
        loop.reset(1000);
        for (var i=1000; i<=2000; i++) {
            loop.tickOnce(i);
        }
        
        var tm_end = new Date().getTime();
        
        test.ok(tm_end-tm_start < 100,
            "Real elapsed time should be far less than 1000ms");
        test.equal(100, cnt,
            "100 ticks should have occurred");
        test.equal(1000, tm_total,
            "1000ms should have elapsed in loop time");

        test.done();
    }

});
