var assert = require('assert');

suite('Hijack - Misc', function() {
  test('Meteor.bindEnvironment support', function(done, server, client) {
    EnableTrackingMethods(server);
    server.evalSync(function() {
      Posts = new Meteor.Collection('posts');
      var Fibers = Npm.require('fibers');

      Meteor.methods({
        'doCall': function() {
          console.log('****INSERTING', Fibers.current);
          var abc = Meteor.bindEnvironment(function() {
            console.log('****INSERTING', Fibers.current);
            Posts.insert({aa: 10});
          }, function() {
            console.log('ERROR', arguments);
          });
          abc();
        }
      });
      emit('return');
    });

    callMethod(client, 'doCall');
    
    var events = GetLastMethodEvents(server, ['type', 'data']);
    console.log(events);
    assert.deepEqual(events, [
      {type: 'start', data: {userId: null}},
      {type: 'wait', data: {waitOn: []}},
      {type: 'waitend', data: undefined},
      {type: 'db', data: {coll: 'posts', func: 'insert'}},
      {type: 'dbend', data: undefined},
      {type: 'complete', data: undefined}
    ]);
    done();
  });

  test('Meteor._wrapAsync support', function(done, server, client) {
    EnableTrackingMethods(server);
    server.evalSync(function() {
      Posts = new Meteor.Collection('posts');
      var Fibers = Npm.require('fibers');

      Meteor.methods({
        'doCall': function() {
          var abc = Meteor._wrapAsync(function(done) {
            Posts.insert({aa: 10});
            done();
          });
          abc();
        }
      });
      emit('return');
    });

    callMethod(client, 'doCall');
    
    var events = GetLastMethodEvents(server, ['type', 'data']);
    assert.deepEqual(events, [
      {type: 'start', data: {userId: null}},
      {type: 'wait', data: {waitOn: []}},
      {type: 'waitend', data: undefined},
      {type: 'async', data: undefined},
      {type: 'asyncend', data: undefined},
      {type: 'complete', data: undefined}
    ]);
    done();
  });
});