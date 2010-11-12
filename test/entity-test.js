/**
 * Test entities
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
require('webtrek/game/entity');
require('webtrek/game/loop');

vows.describe('Entities in the World').addBatch({

    'move an entity in the world': {

        topic: function () {
            var $this = this;

            var world = new WebTrek.Game.World({
                width: 2000, height: 2000
            });

            var loop = new WebTrek.Game.Loop({
                interval_delay: 10,
                tick_duration: 10,
                ontick: function (time, delta) {
                    world.update(time, delta);
                },
                onkill: function () { 
                    $this.callback(null, { 
                        world: world, loop: loop, thing: thing
                    });
                }
            });

            var thing = new WebTrek.Game.Entity.Avatar({
                position: [ 0, 0 ],
                velocity: [ 10, 10 ], // Should be pixels/sec
                max_speed: 50,
                rotation: 0
            });

            world.addEntity(thing);

            loop.start(0, 1000);
        },

        'thing should have moved x=10 in 1 second': function (topic) {
            var thing = topic.thing,
                pos_x = thing.position[0],
                pos_y = thing.position[1];

            assert.equal(Math.round(pos_x), 10);
            assert.equal(Math.round(pos_y), 10);
        }

    }

}).run();
