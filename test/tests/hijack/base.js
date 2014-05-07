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

    var events = GetLastMethodEvents(server, [0, 2]);
    events = CleanComputes(events);
    assert.deepEqual(events, [
      ['start',, {userId: null, params: '[10,"abc"]'}],
      ['wait',, {waitOn: []}],
      ['db',, {coll: 'posts', func: 'insert'}],
      ['complete']
    ]);
    done();
  });
});