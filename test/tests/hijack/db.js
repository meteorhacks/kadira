var assert = require('assert');

suite('Hijack - DB', function() {
  suite('MongoConnector', function() {
    test('insert', function(done, server, client) {
      EnableTrackingMethods(server);
      server.evalSync(function() {
        Posts = new Meteor.Collection('posts');
        Meteor.methods({
          'doCall': function() {
            Posts.insert({aa: 10});
            return "insert";
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
        {type: 'dbend', data: undefined},
        {type: 'complete', data: undefined}
      ]);
      done();
    });

    test('insert: with async callback', function(done, server, client) {
      EnableTrackingMethods(server);
      server.evalSync(function() {
        Posts = new Meteor.Collection('posts');
        Meteor.methods({
          'doCall': function() {
            Posts.insert({aa: 10}, function() {

            });
            return "insert";
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
        {type: 'dbend', data: {async: true}},
        {type: 'complete', data: undefined}
      ]);
      done();
    });

    test('insert:throws error and catch it', function(done, server, client) {
      EnableTrackingMethods(server);
      server.evalSync(function() {
        Posts = new Meteor.Collection('posts');
        Meteor.methods({
          'doCall': function() {
            try {
              Posts.insert({_id: 'aa'});
              Posts.insert({_id: 'aa', aa: 10});
            } catch(ex) {
              
            }
            return "insert";
          }
        });
        emit('return');
      });

      callMethod(client, 'doCall');
      
      var events = GetLastMethodEvents(server, ['type', 'data']);
      //simplyfy the error for testing
      events[6].data.err = events[6].data.err.split(' ')[0];
      
      assert.deepEqual(events, [
        {type: 'start', data: {userId: null}},
        {type: 'wait', data: {waitOn: []}},
        {type: 'waitend', data: undefined},
        {type: 'db', data: {coll: 'posts', func: 'insert'}},
        {type: 'dbend', data: undefined},
        {type: 'db', data: {coll: 'posts', func: 'insert'}},
        {type: 'dbend', data: {err: "E11000"}},
        {type: 'complete', data: undefined}
      ]);
      done();
    });

    test('update', function(done, server, client) {
      EnableTrackingMethods(server);
      server.evalSync(function() {
        Posts = new Meteor.Collection('posts');
        Posts.insert({_id: 'aa', dd: 10});
        Meteor.methods({
          'doCall': function() {
            Posts.update({_id: 'aa'}, {$set: {dd: 30}});
            return "update";
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
        {type: 'db', data: {coll: 'posts', func: 'update', selector: JSON.stringify({_id: 'aa'})}},
        {type: 'dbend', data: undefined},
        {type: 'complete', data: undefined}
      ]);
      done();
    });

    test('remove', function(done, server, client) {
      EnableTrackingMethods(server);
      server.evalSync(function() {
        Posts = new Meteor.Collection('posts');
        Posts.insert({_id: 'aa', dd: 10});
        Meteor.methods({
          'doCall': function() {
            Posts.remove({_id: 'aa'});
            return "remove";
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
        {type: 'db', data: {coll: 'posts', func: 'remove', selector: JSON.stringify({_id: 'aa'})}},
        {type: 'dbend', data: undefined},
        {type: 'complete', data: undefined}
      ]);
      done();
    });

    test('findOne', function(done, server, client) {
      EnableTrackingMethods(server);
      server.evalSync(function() {
        Posts = new Meteor.Collection('posts');
        Posts.insert({_id: 'aa', dd: 10});
        Meteor.methods({
          'doCall': function() {
            return Posts.findOne({_id: 'aa'});
            return "findOne";
          }
        });
        emit('return');
      });

      var res = callMethod(client, 'doCall');
      assert.deepEqual(res, {_id: 'aa', dd: 10});
      
      var events = GetLastMethodEvents(server, ['type', 'data']);
      assert.deepEqual(events, [
        {type: 'start', data: {userId: null}},
        {type: 'wait', data: {waitOn: []}},
        {type: 'waitend', data: undefined},
        {type: 'db', data: {coll: 'posts', func: 'find', selector: JSON.stringify({_id: 'aa'})}},
        {type: 'dbend', data: undefined},
        {type: 'db', data: {coll: 'posts', func: 'fetch', selector: JSON.stringify({_id: 'aa'})}},
        {type: 'dbend', data: undefined},
        {type: 'complete', data: undefined}
      ]);
      done();
    });

    test('upsert', function(done, server, client) {
      EnableTrackingMethods(server);
      server.evalSync(function() {
        Posts = new Meteor.Collection('posts');
        Meteor.methods({
          'doCall': function() {
            Posts.upsert({_id: 'aa'}, {$set: {bb: 20}});
            return "upsert";
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
        {type: 'db', data: {coll: 'posts', func: 'upsert', selector: JSON.stringify({_id: 'aa'})}},
        {type: 'dbend', data: undefined},
        {type: 'complete', data: undefined}
      ]);
      done();
    });

    test('indexes', function(done, server, client) {
      EnableTrackingMethods(server);
      server.evalSync(function() {
        Posts = new Meteor.Collection('posts');
        Meteor.methods({
          'doCall': function() {
            Posts._ensureIndex({aa: 1, bb: 1});
            Posts._dropIndex({aa: 1, bb: 1});
            return "indexes";
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
        {type: 'db', data: {coll: 'posts', func: '_ensureIndex', index: JSON.stringify({aa: 1, bb: 1})}},
        {type: 'dbend', data: undefined},
        {type: 'db', data: {coll: 'posts', func: '_dropIndex', index: JSON.stringify({aa: 1, bb: 1})}},
        {type: 'dbend', data: undefined},
        {type: 'complete', data: undefined}
      ]);
      done();
    });
  });

  suite('Cursor', function() {
    test('count', function(done, server, client) {
      EnableTrackingMethods(server);
      server.evalSync(function() {
        Posts = new Meteor.Collection('posts');
        Posts.insert({aa: 100});
        Posts.insert({aa: 300});

        Meteor.methods({
          'doCall': function() {
            return Posts.find().count();
          }
        });
        emit('return');
      });

      var result = callMethod(client, 'doCall');
      assert.deepEqual(result, 2);
      
      var events = GetLastMethodEvents(server, ['type', 'data']);
      assert.deepEqual(events, [
        {type: 'start', data: {userId: null}},
        {type: 'wait', data: {waitOn: []}},
        {type: 'waitend', data: undefined},
        {type: 'db', data: {coll: 'posts', func: 'find', selector: JSON.stringify({})}},
        {type: 'dbend', data: undefined},
        {type: 'db', data: {coll: 'posts', func: 'count', selector: JSON.stringify({})}},
        {type: 'dbend', data: undefined},
        {type: 'complete', data: undefined}
      ]);
      done();
    });

    test('fetch', function(done, server, client) {
      EnableTrackingMethods(server);
      server.evalSync(function() {
        Posts = new Meteor.Collection('posts');
        Posts.insert({_id: 'aa'});
        Posts.insert({_id: 'bb'});

        Meteor.methods({
          'doCall': function() {
            return Posts.find({_id: {$exists: true}}).fetch();
          }
        });
        emit('return');
      });

      var result = callMethod(client, 'doCall');
      assert.deepEqual(result, [{_id: 'aa'}, {_id: 'bb'}]);
      
      var events = GetLastMethodEvents(server, ['type', 'data']);
      assert.deepEqual(events, [
        {type: 'start', data: {userId: null}},
        {type: 'wait', data: {waitOn: []}},
        {type: 'waitend', data: undefined},
        {type: 'db', data: {coll: 'posts', func: 'find', selector: JSON.stringify({_id: {$exists: true}})}},
        {type: 'dbend', data: undefined},
        {type: 'db', data: {coll: 'posts', func: 'fetch', selector: JSON.stringify({_id: {$exists: true}})}},
        {type: 'dbend', data: undefined},
        {type: 'complete', data: undefined}
      ]);
      done();
    });

    test('map', function(done, server, client) {
      EnableTrackingMethods(server);
      server.evalSync(function() {
        Posts = new Meteor.Collection('posts');
        Posts.insert({_id: 'aa'});
        Posts.insert({_id: 'bb'});

        Meteor.methods({
          'doCall': function() {
            return Posts.find({_id: {$exists: true}}).map(function(doc) {
              return doc._id;
            });
          }
        });
        emit('return');
      });

      var result = callMethod(client, 'doCall');
      assert.deepEqual(result, ['aa', 'bb']);
      
      var events = GetLastMethodEvents(server, ['type', 'data']);
      assert.deepEqual(events, [
        {type: 'start', data: {userId: null}},
        {type: 'wait', data: {waitOn: []}},
        {type: 'waitend', data: undefined},
        {type: 'db', data: {coll: 'posts', func: 'find', selector: JSON.stringify({_id: {$exists: true}})}},
        {type: 'dbend', data: undefined},
        {type: 'db', data: {coll: 'posts', func: 'map', selector: JSON.stringify({_id: {$exists: true}})}},
        {type: 'dbend', data: undefined},
        {type: 'complete', data: undefined}
      ]);
      done();
    });

    test('forEach', function(done, server, client) {
      EnableTrackingMethods(server);
      server.evalSync(function() {
        Posts = new Meteor.Collection('posts');
        Posts.insert({_id: 'aa'});
        Posts.insert({_id: 'bb'});

        Meteor.methods({
          'doCall': function() {
            var res = [];
            Posts.find({_id: {$exists: true}}).forEach(function(doc) {
               res.push(doc._id);
            });
            return res;
          }
        });
        emit('return');
      });

      var result = callMethod(client, 'doCall');
      assert.deepEqual(result, ['aa', 'bb']);
      
      var events = GetLastMethodEvents(server, ['type', 'data']);
      assert.deepEqual(events, [
        {type: 'start', data: {userId: null}},
        {type: 'wait', data: {waitOn: []}},
        {type: 'waitend', data: undefined},
        {type: 'db', data: {coll: 'posts', func: 'find', selector: JSON.stringify({_id: {$exists: true}})}},
        {type: 'dbend', data: undefined},
        {type: 'db', data: {coll: 'posts', func: 'forEach', selector: JSON.stringify({_id: {$exists: true}})}},
        {type: 'dbend', data: undefined},
        {type: 'complete', data: undefined}
      ]);
      done();
    });

    test('forEach:findOne inside', function(done, server, client) {
      EnableTrackingMethods(server);
      server.evalSync(function() {
        Posts = new Meteor.Collection('posts');
        Posts.insert({_id: 'aa'});
        Posts.insert({_id: 'bb'});

        Meteor.methods({
          'doCall': function() {
            var res = [];
            Posts.find({_id: {$exists: true}}).forEach(function(doc) {
               res.push(doc._id);
               Posts.findOne();
            });
            return res;
          }
        });
        emit('return');
      });

      var result = callMethod(client, 'doCall');
      assert.deepEqual(result, ['aa', 'bb']);
      
      var expectedEvents = [
        {type: 'start', data: {userId: null}},
        {type: 'wait', data: {waitOn: []}},
        {type: 'waitend', data: undefined},
        {type: 'db', data: {coll: 'posts', func: 'find', selector: JSON.stringify({_id: {$exists: true}})}},
        {type: 'dbend', data: undefined},
        {type: 'db', data: {coll: 'posts', func: 'forEach', selector: JSON.stringify({_id: {$exists: true}})}},
        {type: 'dbend', data: undefined},
        {type: 'complete', data: undefined}
      ];
      var events = GetLastMethodEvents(server, ['type', 'data']);

      assert.deepEqual(events, expectedEvents);
      done();
    });

  });
});

