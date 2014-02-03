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

        Apm.environment.withValue({method: method}, function() {
          NotificationManager.methodTrackEvent('start', {abc: 100});
          NotificationManager.methodTrackEvent('end', {abc: 200});
          emit('return', method);
        });
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

        Apm.environment.withValue({method: method1}, function() {
          NotificationManager.methodTrackEvent('start', {abc: 100});
        });

        Apm.environment.withValue({method: method2}, function() {
          NotificationManager.methodTrackEvent('end', {abc: 200});
        });

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

  suite('_doesMatchWithLastEvent', function() {
    test('corret', function(done, server) {
      var result = server.evalSync(function() {
        var method = {
          events: [
            {type: 'db'},
            {type: 'dbend'},
            {type: 'http'},
          ]
        };

        var result = NotificationManager._doesMatchWithLastEvent(method, 'httpend');
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
            {type: 'dbend'},
            {type: 'http'}
          ]
        };

        var result = NotificationManager._doesMatchWithLastEvent(method, 'db');
        emit('return', result);
      });

      assert.equal(result, false);
      done();
    });
  });
});