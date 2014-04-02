var assert = require('assert');

suite('Hijack - User Context', function() {
  test('no logged in user', function(done, server, client) {
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

    callMethod(client, 'doCall');
    
    var events = GetLastMethodEvents(server, ['type', 'data']);
    assert.deepEqual(events, [
      {type: 'start', data: {userId: null}},
      {type: 'wait', data: {waitOn: []}},
      {type: 'waitend', data: undefined},
      {type: 'db', data: {coll: 'posts', func: 'insert'}},
      {type: 'dbend', data: {}},
      {type: 'complete', data: undefined}
    ]);
    done();
  });

  // test('with logged in user', function(done, server, client) {
  //   EnableTrackingMethods(server);
  //   client.evalSync(laika.actions.createUser, {username: 'arunoda', password: '123456'});
  //   var user = client.evalSync(laika.actions.loggedInUser);

  //   server.evalSync(function() {
  //     Posts = new Meteor.Collection('posts');
  //     Meteor.methods({
  //       'doCall': function() {
  //         Posts.insert({aa: 10});
  //       }
  //     });
  //     emit('return');
  //   });

  //   callMethod(client, 'doCall');
    
  //   var events = GetLastMethodEvents(server, ['type', 'data']);
  //   assert.deepEqual(events, [
  //     {type: 'start', data: {userId: user._id}},
  //     {type: 'wait', data: {waitOn: []}},
  //     {type: 'waitend', data: undefined},
  //     {type: 'db', data: {coll: 'posts', func: 'insert'}},
  //     {type: 'dbend', data: undefined},
  //     {type: 'complete', data: undefined}
  //   ]);
  //   done();
  // });
});