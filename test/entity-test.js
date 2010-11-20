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

        var thing = new WebTrek.Game.Entity.MotionBase(
            { max_speed: 50 },
            {
                position: [ 0, 0 ],
                velocity: [ 10, 10 ], // Should be pixels/sec
                rotation: 0
            }
        );

        world.addEntity(thing);

        var loop = new WebTrek.Game.Loop({
            interval_delay: 10,
            tick_duration: 10,
        });
        loop.hub.subscribe('tick', function (time, delta) {
            world.update(time, delta);
        });
        loop.hub.subscribe('kill', function () {
            var pos_x = thing.state.position[0],
                pos_y = thing.state.position[1];
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

                avatar.state.position = state.position;
                avatar.state.angle = state.angle;

                var bullet = avatar.fireBullet(time, delta),
                    xpos = bullet.state.position[0],
                    ypos = bullet.state.position[1];

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

        for (var i=0; i<3; i++) {
            var thing = new WebTrek.Game.Entity.Avatar(
                {
                    size: [ 100, 50 ],
                    time_to_live: 2000,
                    max_speed: 500,
                    bounce: 1,
                    max_bounces: 5,
                },
                {
                    position: [ 123, 456 ],
                    angle: [ 3 ],
                    velocity: [ 12, 34 ],
                    acceleration: 100,
                    rotation: 3,
                    bounces_count: 3
                }
            );
            world.addEntity(thing);
        }
        for (var i=0; i<3; i++) {
            var thing = new WebTrek.Game.Entity.Bullet(
                {
                    size: [ 100, 50 ],
                    time_to_live: 2000,
                    max_speed: 500,
                    bounce: 1,
                    max_bounces: 5,
                },
                {
                    position: [ 123, 456 ],
                    angle: [ 3 ],
                    velocity: [ 12, 34 ],
                    acceleration: 100,
                    rotation: 3,
                    bounces_count: 3
                }
            );
            world.addEntity(thing);
        }

        var player = new WebTrek.Game.Player({
            avatar: new WebTrek.Game.Entity.Avatar(
                {},
                {
                    position: [ 400, 400 ],
                    velocity: [ 12, 34 ],
                    angle: [ 2 ],
                }
            )
        });

        world.addPlayer(player);
        world.addEntity(player.avatar);

        player.avatar.fireBullet(0, 15);

        var assert_world = function (world) {
            var objs = _(world.entities).chain().values()
                .map(function (x) { return x.serialize(); });

            // Not doing a comprehensive check of properties, but verify a few.

            test.deepEqual(objs.pluck(0).value(), [
                "Avatar","Avatar","Avatar","Bullet","Bullet", "Bullet",
                "Avatar","Bullet"
            ]);

            test.deepEqual(objs.pluck(1).pluck('id').value(),
                [0,1,2,3,4,5,6,7]);

            test.deepEqual(objs.pluck(1).pluck('owner_id').value(), 
                [ null,null,null,null,null,null,null,6 ]);

            test.deepEqual(objs.pluck(2).pluck('position').value(), [
                [123,456],[123,456],[123,456],[123,456],
                [123,456],[123,456],[400,400],
                [ 413.6394614023852, 406.24220254820716 ]
            ]);

            test.deepEqual(objs.pluck(3).pluck('fire').value(), [
                false,false,false,undefined,undefined,
                undefined,false,undefined
            ]);

            return objs.value();
        };

        var serialized = assert_world(world);

        var alt_world = new WebTrek.Game.World({
            width: 2000, height: 2000
        });

        for (var i=0,s; s=serialized[i]; i++) {
            var entity = WebTrek.Game.Entity.deserialize(s);
            alt_world.addEntity(entity);
        }

        // HACK: Make sure that the serialized IDs are being used.
        alt_world.entity_last_id = 55;

        assert_world(alt_world);

        return test.done();
    },

    "Exercise client rewind/replay on server update from the past": function (test) {

        var s_world = new WebTrek.Game.World({
            width: 2000, height: 2000
        });
        var s_thing = new WebTrek.Game.Entity.Bullet( { }, {
            position: [ 100, 100 ], velocity: [ 10, 0 ],
            max_moves: 200
        });
        s_world.addEntity(s_thing);

        var c_world = new WebTrek.Game.World({
            width: 2000, height: 2000
        });
        var c_thing = new WebTrek.Game.Entity.Bullet( { }, {
            position: [ 100, 100 ], velocity: [ 10, 0 ],
            max_moves: 200
        });
        c_world.addEntity(c_thing);

        var tick_duration = 10, c_tick = 0, s_tick = 0;

        // Move client and server through world together.
        for (var i=0; i<100; i++) {
            c_thing.performUpdate(c_tick, tick_duration);
            c_tick += tick_duration;
            
            s_thing.performUpdate(s_tick, tick_duration);
            s_tick += tick_duration;
        }

        // Both should be in sync.
        test.deepEqual(c_thing.state.position, s_thing.state.position);

        // Run client ahead a bit.
        for (var i=0; i<100; i++) {
            c_thing.performUpdate(c_tick, tick_duration);
            c_tick += tick_duration;
        }

        // Meanwhile, server changes velocity and informs client.
        s_thing.state.velocity = [ 20, 20 ];
        c_thing.applyRemoteUpdate(s_tick, s_thing.produceRemoteUpdate());

        // Run server to catch up to client.
        for (var i=0; i<100; i++) {
            s_thing.performUpdate(s_tick, tick_duration);
            s_tick += tick_duration;
        }

        // Both should still be in sync, despite client having run ahead with
        // different velocity.
        test.deepEqual(c_thing.state.position, s_thing.state.position);

        return test.done();
    }

});
