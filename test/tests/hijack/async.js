var assert = require('assert');

suite('Hijack - Async', function() {
  test('track with _wrapAsync', function(done, server, client) {
    server.evalSync(function() {
      var wait = Meteor._wrapAsync(function(waitTime, callback) {
        setTimeout(callback, waitTime);
      });

      Meteor.methods({
        'wait': function() {
          wait(100);
        }
      });
      
      emit('return');
    });

    callMethod(client, 'wait');

    var events = getLastMethodEvents(server);
    assert.deepEqual(events, [
      {type: 'start'},
      {type: 'wait'},
      {type: 'waitend'},
      {type: 'async'},
      {type: 'asyncend'},
      {type: 'complete'},
    ]);
    done();
  });
});