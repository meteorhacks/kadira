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

      var events = GetLastMethodEvents(server, [0, 2]);
      events = CleanComputes(events);
      assert.deepEqual(events, [
        ['start', , {userId: null, params: '[]'}],
        ['wait', , {waitOn: []}],
        ['db', , {coll: 'posts', func: 'insert'}],
        ['complete']
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

      var events = GetLastMethodEvents(server, [0, 2]);
      events = CleanComputes(events);
      assert.deepEqual(events, [
        ['start',,{userId: null, params: '[]'}],
        ['wait',,{waitOn: []}],
        ['db',,{coll: 'posts', func: 'insert', async: true}],
        ['complete']
      ]);
      done();
    });

    test('insert: throws error and catch it', function(done, server, client) {
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

      var events = GetLastMethodEvents(server, [0, 2]);
      events = CleanComputes(events);
      //simplyfy the error for testing
      events[3][2].err = events[3][2].err.match(/E11000/g)? "E11000": null;

      assert.deepEqual(events, [
        ['start',, {userId: null, params: '[]'}],
        ['wait',, {waitOn: []}],
        ['db',, {coll: 'posts', func: 'insert'}],
        ['db',, {coll: 'posts', func: 'insert', err: "E11000"}],
        ['complete']
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

      var events = GetLastMethodEvents(server, [0, 2]);
      events = CleanComputes(events);
      assert.deepEqual(events, [
        ['start',, {userId: null, params: '[]'}],
        ['wait',, {waitOn: []}],
        ['db',, {coll: 'posts', func: 'update', selector: JSON.stringify({_id: 'aa'}), updatedDocs: 1}],
        ['complete']
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

      var events = GetLastMethodEvents(server, [0, 2]);
      events = CleanComputes(events);
      assert.deepEqual(events, [
        ['start',, {userId: null, params: '[]'}],
        ['wait',, {waitOn: []}],
        ['db',, {coll: 'posts', func: 'remove', selector: JSON.stringify({_id: 'aa'}), removedDocs: 1}],
        ['complete']
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

      var events = GetLastMethodEvents(server, [0, 2]);
      events = CleanComputes(events);
      assert.deepEqual(events, [
        ['start',,{userId: null, params: '[]'}],
        ['wait',,{waitOn: []}],
        ['db',,{coll: 'posts', func: 'find', selector: JSON.stringify({_id: 'aa'})}],
        ['db',,{coll: 'posts', func: 'fetch', cursor: true, selector: JSON.stringify({_id: 'aa'}), docsFetched: 1}],
        ['complete']
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
            Posts.upsert({_id: 'aa'}, {$set: {bb: 30}});
            return "upsert";
          }
        });
        emit('return');
      });

      callMethod(client, 'doCall');

      var events = GetLastMethodEvents(server, [0, 2]);
      events = CleanComputes(events);
      assert.deepEqual(events, [
        ['start',,{userId: null, params: '[]'}],
        ['wait',,{waitOn: []}],
        ['db',,{coll: 'posts', func: 'upsert', selector: JSON.stringify({_id: 'aa'}), updatedDocs: 1, insertedId: 'aa'}],
        ['db',,{coll: 'posts', func: 'upsert', selector: JSON.stringify({_id: 'aa'}), updatedDocs: 1}],
        ['complete']
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

      var events = GetLastMethodEvents(server, [0, 2]);
      events = CleanComputes(events);
      assert.deepEqual(events, [
        ['start',,{userId: null, params: '[]'}],
        ['wait',,{waitOn: []}],
        ['db',,{coll: 'posts', func: '_ensureIndex', index: JSON.stringify({aa: 1, bb: 1})}],
        ['db',,{coll: 'posts', func: '_dropIndex', index: JSON.stringify({aa: 1, bb: 1})}],
        ['complete']
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

      var events = GetLastMethodEvents(server, [0, 2]);
      events = CleanComputes(events);
      assert.deepEqual(events, [
        ['start',,{userId: null, params: '[]'}],
        ['wait',,{waitOn: []}],
        ['db',,{coll: 'posts', func: 'find', selector: JSON.stringify({})}],
        ['db',,{coll: 'posts', cursor: true, func: 'count', selector: JSON.stringify({})}],
        ['complete']
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

      var events = GetLastMethodEvents(server, [0, 2]);
      events = CleanComputes(events);
      assert.deepEqual(events, [
        ['start',,{userId: null, params: '[]'}],
        ['wait',,{waitOn: []}],
        ['db',,{coll: 'posts', func: 'find', selector: JSON.stringify({_id: {$exists: true}})}],
        ['db',,{coll: 'posts', cursor: true, func: 'fetch', selector: JSON.stringify({_id: {$exists: true}}), docsFetched: 2}],
        ['complete']
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

      var events = GetLastMethodEvents(server, [0, 2]);
      events = CleanComputes(events);
      assert.deepEqual(events, [
        ['start',,{userId: null, params: '[]'}],
        ['wait',,{waitOn: []}],
        ['db',,{coll: 'posts', func: 'find', selector: JSON.stringify({_id: {$exists: true}})}],
        ['db',,{coll: 'posts', cursor: true, func: 'map', selector: JSON.stringify({_id: {$exists: true}}), docsFetched: 2}],
        ['complete']
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

      var events = GetLastMethodEvents(server, [0, 2]);
      events = CleanComputes(events);
      assert.deepEqual(events, [
        ['start',,{userId: null, params: '[]'}],
        ['wait',,{waitOn: []}],
        ['db',,{coll: 'posts', func: 'find', selector: JSON.stringify({_id: {$exists: true}})}],
        ['db',,{coll: 'posts', cursor: true, func: 'forEach', selector: JSON.stringify({_id: {$exists: true}})}],
        ['complete']
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
        ['start',,{userId: null, params: '[]'}],
        ['wait',,{waitOn: []}],
        ['db',,{coll: 'posts', func: 'find', selector: JSON.stringify({_id: {$exists: true}})}],
        ['db',,{coll: 'posts', cursor: true, func: 'forEach', selector: JSON.stringify({_id: {$exists: true}})}],
        ['complete']
      ];
      var events = GetLastMethodEvents(server, [0, 2]);
      events = CleanComputes(events);

      assert.deepEqual(events, expectedEvents);
      done();
    });

    test('observeChanges', function(done, server, client) {
      EnableTrackingMethods(server);
      server.evalSync(function() {
        Posts = new Meteor.Collection('posts');
        Posts.insert({_id: 'aa'});
        Posts.insert({_id: 'bb'});

        Meteor.methods({
          'doCall': function() {
            var data = [];
            var handle = Posts.find({}).observeChanges({
              added: function(id, fields) {
                fields._id = id;
                data.push(fields);
              }
            });
            handle.stop();
            return data;
          }
        });
        emit('return');
      });

      var result = callMethod(client, 'doCall');
      assert.deepEqual(result, [{_id: 'aa'}, {_id: 'bb'}]);

      var expectedDocs = [
        ['start',,{userId: null, params: '[]'}],
        ['wait',,{waitOn: []}],
        ['db',,{coll: 'posts', func: 'find', selector: JSON.stringify({})}],
        ['db',,{coll: 'posts', cursor: true, func: 'observeChanges', selector: JSON.stringify({}), oplog: false, noOfHandles: 1, noOfCachedDocs: 2}],
        //oplog is always false since tests do not uses oplog
        ['complete']
      ];

      var events = GetLastMethodEvents(server, [0, 2]);
      events = CleanComputes(events);
      assert.deepEqual(events, expectedDocs);
      done();
    });

    test('observeChanges:re-using-multiflexer', function(done, server, client) {
      EnableTrackingMethods(server);
      server.evalSync(function() {
        Posts = new Meteor.Collection('posts');
        Posts.insert({_id: 'aa'});
        Posts.insert({_id: 'bb'});

        Meteor.methods({
          'doCall': function() {
            var data = [];
            var handle = Posts.find({}).observeChanges({
              added: function(id, fields) {
                fields._id = id;
                data.push(fields);
              }
            });

            //again
            var handle2 = Posts.find({}).observeChanges({
              added: function(id, fields) {

              }
            });

            handle.stop();
            handle2.stop();
            return data;
          }
        });
        emit('return');
      });

      var result = callMethod(client, 'doCall');
      assert.deepEqual(result, [{_id: 'aa'}, {_id: 'bb'}]);

      var events = GetLastMethodEvents(server, [0, 2]);
      events = CleanComputes(events);
      assert.deepEqual(events, [
        ['start',,{userId: null, params: '[]'}],
        ['wait',,{waitOn: []}],
        ['db',,{coll: 'posts', func: 'find', selector: JSON.stringify({})}],
        ['db',,{coll: 'posts', cursor: true, func: 'observeChanges', selector: JSON.stringify({}), oplog: false, noOfHandles: 1, noOfCachedDocs: 2}],
        //oplog is always false since tests do not uses oplog

        ['db',,{coll: 'posts', func: 'find', selector: JSON.stringify({})}],
        ['db',,{coll: 'posts', cursor: true, func: 'observeChanges', selector: JSON.stringify({}), oplog: false, noOfHandles: 2, noOfCachedDocs: 2}],
        //oplog is always false since tests do not uses oplog
        ['complete']
      ]);
      done();
    });

    test('observe', function(done, server, client) {
      EnableTrackingMethods(server);
      server.evalSync(function() {
        Posts = new Meteor.Collection('posts');
        Posts.insert({_id: 'aa'});
        Posts.insert({_id: 'bb'});

        Meteor.methods({
          'doCall': function() {
            var data = [];
            var handle = Posts.find({}).observe({
              added: function(doc) {
                data.push(doc);
              }
            });
            handle.stop();
            return data;
          }
        });
        emit('return');
      });

      var result = callMethod(client, 'doCall');
      assert.deepEqual(result, [{_id: 'aa'}, {_id: 'bb'}]);

      var events = GetLastMethodEvents(server, [0, 2]);
      events = CleanComputes(events);
      assert.deepEqual(events, [
        ['start',,{userId: null, params: '[]'}],
        ['wait',,{waitOn: []}],
        ['db',,{coll: 'posts', func: 'find', selector: JSON.stringify({})}],
        ['db',,{coll: 'posts', func: 'observe', cursor: true, selector: JSON.stringify({}), oplog: false, noOfHandles: 1, noOfCachedDocs: 2}],
        //oplog is always false since tests do not uses oplog
        ['complete']
      ]);
      done();
    });

    test('rewind', function(done, server, client) {
      EnableTrackingMethods(server);
      server.evalSync(function() {
        Posts = new Meteor.Collection('posts');
        Posts.insert({_id: 'aa'});
        Posts.insert({_id: 'bb'});

        Meteor.methods({
          'doCall': function() {
            var curosr = Posts.find({_id: {$exists: true}});
            curosr.fetch();
            curosr.rewind();
            return curosr.fetch();
          }
        });
        emit('return');
      });

      var result = callMethod(client, 'doCall');
      assert.deepEqual(result, [{_id: 'aa'}, {_id: 'bb'}]);

      var events = GetLastMethodEvents(server, [0, 2]);
      events = CleanComputes(events);
      assert.deepEqual(events, [
        ['start',,{userId: null, params: '[]'}],
        ['wait',,{waitOn: []}],
        ['db',,{coll: 'posts', func: 'find', selector: JSON.stringify({_id: {$exists: true}})}],
        ['db',,{coll: 'posts', func: 'fetch', cursor: true, selector: JSON.stringify({_id: {$exists: true}}), docsFetched: 2}],
        ['db',,{coll: 'posts', func: 'rewind', cursor: true, selector: JSON.stringify({_id: {$exists: true}})}],
        ['db',,{coll: 'posts', func: 'fetch', cursor: true, selector: JSON.stringify({_id: {$exists: true}}), docsFetched: 2}],
        ['complete']
      ]);
      done();
    });

  });
});

