var assert = require('assert');

suite('Hijack - Async', function() {
  test('track with _wrapAsync', function(done, server, client) {
    EnableTrackingMethods(server);
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

    var events = GetLastMethodEvents(server);
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

  test('track with _wrapAsync: error', function(done, server, client) {
    EnableTrackingMethods(server);
    server.evalSync(function() {
      var wait = Meteor._wrapAsync(function(waitTime, callback) {
        setTimeout(function() {
          callback(new Error('abc'));
        }, waitTime);
      });

      Meteor.methods({
        'wait': function() {
          try {
            wait(100);
          } catch(ex) {
            
          }
        }
      });
      
      emit('return');
    });

    callMethod(client, 'wait');

    var events = GetLastMethodEvents(server);
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

  test('track with Async.wrap: error', function(done, server, client) {
    EnableTrackingMethods(server);
    server.evalSync(function() {
      var wait = Async.wrap(function(waitTime, callback) {
        setTimeout(function() {
          callback(new Error('hello-error'));
        }, waitTime);
      });

      Meteor.methods({
        'wait': function() {
          try {
            wait(100);
          } catch(ex) {
            
          }
        }
      });
      
      emit('return');
    });

    callMethod(client, 'wait');

    var events = GetLastMethodEvents(server, ['type', 'data']);
    assert.deepEqual(events, [
      {type: 'start', data: {userId: null}},
      {type: 'wait', data: {waitOn: []}},
      {type: 'waitend', data: undefined},
      {type: 'async', data: undefined},
      {type: 'asyncend', data: {err: 'hello-error'}},
      {type: 'complete', data: undefined},
    ]);
    done();
  });
});