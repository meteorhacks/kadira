var assert = require('assert');

suite('Notification Manager', function() {
  suite('methodTrackEvent', function() {
    test('single method', function(done, server) {
      var method = server.evalSync(function() {
        var method = {
          name: 'aa',
          id: '1',
          events: []
        };

        Npm.require('fibers').current.__apmInfo = {
          session: 'sid',
          usertId: 'uid',
          method: method
        };

        NotificationManager.methodTrackEvent('start', {abc: 100});
        NotificationManager.methodTrackEvent('end', {abc: 200});
        emit('return', method);
      });

      assert.deepEqual(method.events[0].type, 'start');
      assert.deepEqual(method.events[0].data, {abc: 100});

      assert.deepEqual(method.events[1].type, 'end');
      assert.deepEqual(method.events[1].data, {abc: 200});
      done();
    });

    test('multiple method', function(done, server) {
      var methodsStore = server.evalSync(function() {
        var method1 = {
          name: 'aa',
          id: '1',
          events: []
        };

        var method2 = {
          name: 'aa',
          id: '2',
          events: []
        };

        Npm.require('fibers').current.__apmInfo = {
          session: 'sid',
          usertId: 'uid',
          method: method1
        };

        NotificationManager.methodTrackEvent('start', {abc: 100});

        //set as a new method
        Npm.require('fibers').current.__apmInfo.method = method2;

        NotificationManager.methodTrackEvent('end', {abc: 200});
        emit('return', [method1, method2]);
      });

      assert.equal(methodsStore.length, 2);

      assert.deepEqual(methodsStore[0].events[0].type, 'start');
      assert.deepEqual(methodsStore[0].events[0].data, {abc: 100});

      assert.deepEqual(methodsStore[1].events[0].type, 'end');
      assert.deepEqual(methodsStore[1].events[0].data, {abc: 200});
      done();
    });

    test('custom apmInfo', function(done, server) {
      var method = server.evalSync(function() {
        var method = {
          name: 'aa',
          id: '1',
          events: []
        };

        var apmInfo = {
          session: 'sid',
          usertId: 'uid',
          method: method
        };

        NotificationManager.methodTrackEvent('start', {abc: 100}, apmInfo);

        emit('return', method);
      });

      assert.deepEqual(method.events[0].type, 'start');
      assert.deepEqual(method.events[0].data, {abc: 100});
      done();
    });
  });
});