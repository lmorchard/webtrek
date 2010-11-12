/**
 * Test networking
 */
require.paths.unshift(__dirname + '/../deps')
require.paths.unshift(__dirname + '/../htdocs/js')
require.paths.unshift(__dirname + '/../lib')

var vows = require('vows'),
    assert = require('assert');

require('underscore');
require('class');
require('webtrek');
require('webtrek/game');
require('webtrek/game/world');
require('webtrek/game/player');
require('webtrek/game/entity');
require('webtrek/game/loop');
require('webtrek/server');
require('webtrek/network');

vows.describe('Entity events').addBatch({

    'vows should work': {
        topic: function () { return 23; },
        'should be 23': function (topic) {
            assert.equal(topic, 23);
        }
    }

}).run();
