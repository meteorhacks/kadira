var assert = require('assert');

suite('Notification Manager', function() {
  suite('methodTrackEvent', function() {
    test('single method', function(done, server) {
      var methodsStore = server.evalSync(function() {
        Npm.require('fibers').current.__apmInfo = {
          session: 'sid',
          usertId: 'uid',
          method: {
            name: 'aa',
            id: '1'
          }
        };

        NotificationManager.methodTrackEvent('start', {abc: 100});
        NotificationManager.methodTrackEvent('end', {abc: 200});
        var methodsStore = Apm.models.methods.methodsStore;
        emit('return', methodsStore);
      });

      var id = 'sid::1';
      assert.ok(methodsStore[id]);

      assert.deepEqual(methodsStore[id].events[0].type, 'start');
      assert.deepEqual(methodsStore[id].events[0].data, {abc: 100});

      assert.deepEqual(methodsStore[id].events[1].type, 'end');
      assert.deepEqual(methodsStore[id].events[1].data, {abc: 200});
      done();
    });

    test('multiple method', function(done, server) {
      var methodsStore = server.evalSync(function() {
        Npm.require('fibers').current.__apmInfo = {
          session: 'sid',
          usertId: 'uid',
          method: {
            name: 'aa',
            id: '1'
          }
        };

        NotificationManager.methodTrackEvent('start', {abc: 100});

        //set as a new method
        Npm.require('fibers').current.__apmInfo.method.id =2;

        NotificationManager.methodTrackEvent('end', {abc: 200});
        var methodsStore = Apm.models.methods.methodsStore;
        emit('return', methodsStore);
      });

      var id = 'sid::1';
      var id2 = 'sid::2';
      assert.ok(methodsStore[id]);
      assert.ok(methodsStore[id2]);

      assert.deepEqual(methodsStore[id].events[0].type, 'start');
      assert.deepEqual(methodsStore[id].events[0].data, {abc: 100});

      assert.deepEqual(methodsStore[id2].events[0].type, 'end');
      assert.deepEqual(methodsStore[id2].events[0].data, {abc: 200});
      done();
    });

    test('custom apmInfo', function(done, server) {
      var methodsStore = server.evalSync(function() {
        var apmInfo = {
          session: 'sid',
          usertId: 'uid',
          method: {
            name: 'aa',
            id: '1'
          }
        };

        NotificationManager.methodTrackEvent('start', {abc: 100}, apmInfo);

        var methodsStore = Apm.models.methods.methodsStore;
        emit('return', methodsStore);
      });

      var id = 'sid::1';
      var id2 = 'sid::2';
      assert.ok(methodsStore[id]);

      assert.deepEqual(methodsStore[id].events[0].type, 'start');
      assert.deepEqual(methodsStore[id].events[0].data, {abc: 100});
      done();
    });
  });

  suite('_isLastEventIsStart', function() {
    test('corret', function(done, server) {
      var result = server.evalSync(function() {
        var method = {
          events: [
            {type: 'db'},
            {type: 'dbend'},
            {type: 'http'},
          ]
        };

        var result = NotificationManager._isLastEventIsStart(method);
        emit('return', result);
      });

      assert.equal(result, true);
      done();
    });

    test('incorret', function(done, server) {
      var result = server.evalSync(function() {
        var method = {
          events: [
            {type: 'db'},
            {type: 'dbend'}
          ]
        };

        var result = NotificationManager._isLastEventIsStart(method);
        emit('return', result);
      });

      assert.equal(result, false);
      done();
    });
  });
});