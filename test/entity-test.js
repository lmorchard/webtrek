/**
 * Test entities
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
require('webtrek/network');
require('webtrek/game');
require('webtrek/game/world');
require('webtrek/game/entity');
require('webtrek/game/player');
require('webtrek/game/loop');

module.exports = nodeunit.testCase({

    "Entity movement": function (test) {

        var world = new WebTrek.Game.World({
            width: 2000, height: 2000
        });

        var thing = new WebTrek.Game.Entity.MotionBase({
            position: [ 0, 0 ],
            velocity: [ 10, 10 ], // Should be pixels/sec
            max_speed: 50,
            rotation: 0
        });

        world.addEntity(thing);

        var loop = new WebTrek.Game.Loop({
            interval_delay: 10,
            tick_duration: 10,
        });
        loop.hub.subscribe('tick', function (time, delta) {
            world.update(time, delta);
        });
        loop.hub.subscribe('kill', function () {
            var pos_x = thing.position[0],
                pos_y = thing.position[1];
            test.equal(Math.round(pos_x), 10);
            test.equal(Math.round(pos_y), 10);
            test.done();
        });

        loop.start(0, 1000);

    },

    "Bullets fired at world's edges should be snapped in-bounds": function (test) {

        var world = new WebTrek.Game.World({
            width: 1000, height: 1000
        });

        var avatar = new WebTrek.Game.Entity.Avatar({
            position: [ 0, 0 ],
            velocity: [ 10, 10 ], // Should be pixels/sec
            max_speed: 50,
            rotation: 0
        });
        world.addEntity(avatar);

        var states = [
            { position: [0, 500],    angle: -( Math.PI / 2 ) },
            { position: [500, 0],    angle:    0 },
            { position: [1000, 500], angle:  ( Math.PI / 2 ) },
            { position: [500, 1000], angle:  ( Math.PI) },
        ];

        var loop = new WebTrek.Game.Loop({
            interval_delay: 10,
            tick_duration: 10
        });
        loop.hub.subscribe('tick', function (time, delta) {
            var state = states.shift();
            if (state) {

                avatar.position = state.position;
                avatar.angle = state.angle;

                var bullet = avatar.fireBullet(time, delta),
                    xpos = bullet.position[0],
                    ypos = bullet.position[1];

                world.update(time, delta);

                test.ok(xpos >= 0);
                test.ok(xpos <= world.options.width);
                test.ok(ypos >= 0);
                test.ok(ypos <= world.options.height);

            } else {
                loop.kill();
                test.done();
            }
        });

        loop.start(0, 1000);
    },

    "Serialize / Deserialize": function (test) {

        var world = new WebTrek.Game.World({
            width: 2000, height: 2000
        });

        var props = {
            position: [ 123, 456 ],
            size: [ 100, 50 ],
            angle: [ 3 ],
            time_to_live: 2000,
            velocity: [ 12, 34 ],
            acceleration: 100,
            rotation: 3,
            max_speed: 500,
            bounce: 1,
            max_bounces: 5,
            bounces_count: 3
        };

        for (var i=0; i<3; i++) {
            var thing = new WebTrek.Game.Entity.Avatar(_(props).clone());
            world.addEntity(thing);
        }
        for (var i=0; i<3; i++) {
            var thing = new WebTrek.Game.Entity.Bullet(_(props).clone());
            world.addEntity(thing);
        }

        var player = new WebTrek.Game.Player({
            avatar: new WebTrek.Game.Entity.Avatar({
                position: [ 400, 400 ],
                velocity: [ 12, 34 ],
                angle: [ 2 ],
            })
        });

        world.addPlayer(player);
        world.addEntity(player.avatar);

        player.avatar.fireBullet(0, 15);

        var assert_world = function (world) {
            var objs = _(world.entities).chain()
                .values().map(function (x) { return x.serialize(); });

            // Not doing a comprehensive check of properties, but verify a few.
            
            test.deepEqual(objs.pluck('id').value(), [
                0, 1, 2, 3, 4, 5, 6, 7
            ]);

            test.deepEqual(objs.pluck('entity_type').value(), [
                "Avatar","Avatar","Avatar","Bullet","Bullet", "Bullet",
                "Avatar","Bullet"
            ]);

            test.deepEqual(objs.pluck('owner_id').value(), [
                undefined,undefined,undefined,null,null,
                null,undefined,6
            ]);

            test.deepEqual(objs.pluck('max_bounces').value(),
                [undefined,undefined,undefined,5,5,5,undefined,2]);

            test.deepEqual(objs.pluck('size').value(), [
                [100,50],[100,50],[100,50],[100,50],[100,50],
                [100,50],[20,30],[2,2]
            ]);

            return objs.value();
        };

        var serialized = assert_world(world);

        var alt_world = new WebTrek.Game.World({
            width: 2000, height: 2000
        });

        // HACK: Make sure that the serialized IDs are being used.
        alt_world.entity_last_id = 55;

        alt_world.addSerializedEntities(serialized);

        assert_world(alt_world);

        test.done();
    }

});
