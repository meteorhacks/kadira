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
    events = CleanComputes(events);
    assert.deepEqual(events, [
      ['start'],
      ['wait'],
      ['async'],
      ['complete']
    ]);
    done();
  });

  test('track with _wrapAsync: error', function(done, server, client) {
    EnableTrackingMethods(server);
    server.evalSync(function() {
      var wait = Meteor._wrapAsync(function(waitTime, callback) {
        setTimeout(function() {
          callback(new Error('hello'));
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
    events = CleanComputes(events);
    assert.deepEqual(events, [
      ['start'],
      ['wait'],
      ['async'],
      ['complete']
    ]);
    done();
  });

  test('track with Async.wrap: error', function(done, server, client) {
    EnableTrackingMethods(server);
    server.evalSync(function() {
      var wait = Async.wrap(function(waitTime, callback) {
        setTimeout(function() {
          callback(new Error('hello'));
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

    var events = GetLastMethodEvents(server, [0]);
    events = CleanComputes(events);
    assert.deepEqual(events, [
      ['start'],
      ['wait'],
      ['async'],
      ['complete']
    ]);
    done();
  });

  test('track with Async.wrap: error and continue', function(done, server, client) {
    EnableTrackingMethods(server);
    server.evalSync(function() {
      var wait = Async.wrap(function(waitTime, callback) {
        setTimeout(function() {
          callback(new Error('hello'));
        }, waitTime);
      });

      Meteor.methods({
        'wait': function() {
          var Posts = new Meteor.Collection('posts');
          try {
            wait(100);
          } catch(ex) {

          }
          Posts.find({}).fetch();
        }
      });

      emit('return');
    });

    var err = callMethod(client, 'wait');

    var events = GetLastMethodEvents(server, [0, 2]);
    events = CleanComputes(events);
    assert.deepEqual(events, [
      ['start',, {userId: null, params: '[]'}],
      ['wait',, {waitOn: []}],
      ['async',, {}],
      ['db',, {coll: 'posts', func: 'find', selector: JSON.stringify({})}],
      ['db',, {coll: 'posts', func: 'fetch', cursor: true, selector: JSON.stringify({}), docsFetched: 0}],
      ['complete']
    ]);
    done();
  });
});