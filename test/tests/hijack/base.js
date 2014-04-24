var assert = require('assert');

suite('Hijack - Base Tracking', function() {
  test('method params', function(done, server, client) {
    EnableTrackingMethods(server);
    server.evalSync(function() {
      Posts = new Meteor.Collection('posts');
      Meteor.methods({
        'doCall': function() {
          Posts.insert({aa: 10});
        }
      });
      emit('return');
    });

    callMethod(client, 'doCall', [10, "abc"]);
    
    var events = GetLastMethodEvents(server, ['type', 'data']);
    assert.deepEqual(events, [
      {type: 'start', data: {userId: null, params: '[10,"abc"]'}},
      {type: 'wait', data: {waitOn: []}},
      {type: 'waitend', data: undefined},
      {type: 'db', data: {coll: 'posts', func: 'insert'}},
      {type: 'dbend', data: {}},
      {type: 'complete', data: undefined}
    ]);
    done();
  });
});