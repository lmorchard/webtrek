/**
 * Test the loop
 */
require.paths.unshift(__dirname + '/../deps')
require.paths.unshift(__dirname + '/../htdocs/js')
require.paths.unshift(__dirname + '/../lib')

var vows = require('vows'),
    util   = require('util'),
    events = require('events'),
    assert = require('assert');

require('underscore');
require('class');
require('webtrek');
require('webtrek/game');
require('webtrek/game/world');
require('webtrek/game/loop');

vows.describe('Running the event loop').addBatch({

    'run the loop': {

        topic: function () {
            var $this = this;

            var world = new WebTrek.Game.World({
                width: 1000, height: 1000
            });

            var loop = new WebTrek.Game.Loop({
                interval_delay: 10,
                tick_duration: 10,
                ontick: function (time, delta) {
                    world.update(time, delta);
                },
                onkill: function () { 
                    $this.callback(null, { world: world, loop: loop });
                }
            });

            loop.start(0, 1000);
        },

        'loop should end at around 1000': function (topic) {
            assert.ok(topic.loop.tick >= 1000 - topic.loop.options.tick_duration,
                "Loop should run up to at least the last tick");
            assert.ok(topic.loop.tick <= 1000,
                "Loop should not run over the last tick");
        }

    }

}).run();
