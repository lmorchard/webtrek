/**
 * Test utils
 */
require.paths.unshift(__dirname + '/../deps')
require.paths.unshift(__dirname + '/../htdocs/js')
require.paths.unshift(__dirname + '/../lib')

var io = require('socket.io'),
    util = require('util'),
    events = require('events'),
    assert = require('assert'),
    nodeunit = require('nodeunit');

require('underscore');
require('class');
require('webtrek');
require('webtrek/utils');

module.exports = nodeunit.testCase({

    "Exercise pub/sub": function (test) {
        var ps = new WebTrek.Utils.PubSub();

        var fns = [];
        for (var i=0; i<6; i++) {
            var fn = function (alpha, beta, gamma) { 
                arguments.callee.called = [alpha, beta, gamma];
            };
            fns.push(fn);
            if (i<3) {
                ps.subscribe('testit', fn);
            }
        }

        ps.publish('testit', 'alpha', 'beta', 'gamma');

        var result = _(fns).pluck('called'),
            expected = [ 
                ['alpha', 'beta', 'gamma'], 
                ['alpha', 'beta', 'gamma'], 
                ['alpha', 'beta', 'gamma'], 
                undefined, 
                undefined, 
                undefined 
            ];

        test.deepEqual(result, expected);
        test.done();
    }

});
