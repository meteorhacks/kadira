var assert = require('assert');

suite('Tracer', function() {
  test('trace-method', function(done, server) {
    var traceInfo = server.evalSync(function() {
      var ddpMessage = {
        id: 'the-id',
        msg: 'method',
        method: 'method-name'
      };

      var traceInfo = Apm.tracer.start({id: 'session-id', userId: 'uid'}, ddpMessage);
      Apm.tracer.event(traceInfo, 'start', {abc: 100});
      Apm.tracer.event(traceInfo, 'end', {abc: 200});
      emit('return', traceInfo);
    });

    removeDate(traceInfo);
    assert.deepEqual(traceInfo, {
      _id: 'session-id::the-id',
      id: 'the-id',
      session: 'session-id',
      userId: "uid",
      type: 'method',
      name: 'method-name',
      events: [
        {type: 'start', data: {abc: 100}},
        {type: 'end', data: {abc: 200}}
      ]
    });

    done();
  });

  test('trace-sub', function(done, server) {
      var traceInfo = server.evalSync(function() {
        var ddpMessage = {
          id: 'the-id',
          msg: 'sub',
          name: 'sub-name'
        };

        var traceInfo = Apm.tracer.start({id: 'session-id'}, ddpMessage);
        Apm.tracer.event(traceInfo, 'start', {abc: 100});
        Apm.tracer.event(traceInfo, 'end', {abc: 200});
        emit('return', traceInfo);
      });

      removeDate(traceInfo);
      assert.deepEqual(traceInfo, {
        _id: 'session-id::the-id',
        id: 'the-id',
        session: 'session-id',
        type: 'sub',
        name: 'sub-name',
        events: [
          {type: 'start', data: {abc: 100}},
          {type: 'end', data: {abc: 200}}
        ]
      });

      done();
  });

  test('trace-other-ddp', function(done, server) {
      var traceInfo = server.evalSync(function() {
        var ddpMessage = {
          id: 'the-id',
          msg: 'unsub',
          name: 'sub-name'
        };

        var traceInfo = Apm.tracer.start({id: 'session-id'}, ddpMessage);
        emit('return', traceInfo);
      });

      assert.equal(traceInfo, null);
      done();
  });

  test('trace-other-events', function(done, server) {
      var traceInfo = server.evalSync(function() {
        var ddpMessage = {
          id: 'the-id',
          msg: 'method',
          method: 'method-name'
        };

        var traceInfo = Apm.tracer.start({id: 'session-id'}, ddpMessage);
        Apm.tracer.event(traceInfo, 'start', {abc: 100});

        var eventId = Apm.tracer.event(traceInfo, 'db');
        Apm.tracer.eventEnd(traceInfo, eventId);

        Apm.tracer.event(traceInfo, 'end', {abc: 200});
        emit('return', traceInfo);
      });

      removeDate(traceInfo);
      assert.deepEqual(traceInfo, {
        _id: 'session-id::the-id',
        id: 'the-id',
        session: 'session-id',
        type: 'method',
        name: 'method-name',
        events: [
          {type: 'start', data: {abc: 100}},
          {type: 'db'},
          {type: 'dbend'},
          {type: 'end', data: {abc: 200}}
        ],
        _lastEventId: null
      });

      done();
  });

  test('trace-same-event-twice-at-row', function(done, server) {
      var traceInfo = server.evalSync(function() {
        var ddpMessage = {
          id: 'the-id',
          msg: 'method',
          method: 'method-name'
        };

        var traceInfo = Apm.tracer.start({id: 'session-id'}, ddpMessage);
        Apm.tracer.event(traceInfo, 'start', {abc: 100});

        var eventId = Apm.tracer.event(traceInfo, 'db');
        Apm.tracer.event(traceInfo, 'db');
        Apm.tracer.eventEnd(traceInfo, eventId);

        Apm.tracer.event(traceInfo, 'end', {abc: 200});
        emit('return', traceInfo);
      });

      removeDate(traceInfo);
      assert.deepEqual(traceInfo, {
        _id: 'session-id::the-id',
        id: 'the-id',
        session: 'session-id',
        type: 'method',
        name: 'method-name',
        events: [
          {type: 'start', data: {abc: 100}},
          {type: 'db'},
          {type: 'dbend'},
          {type: 'end', data: {abc: 200}}
        ],
        _lastEventId: null
      });

      done();
  });

  test('trace-with-invalid-eventId', function(done, server) {
      var traceInfo = server.evalSync(function() {
        var ddpMessage = {
          id: 'the-id',
          msg: 'method',
          method: 'method-name'
        };

        var traceInfo = Apm.tracer.start({id: 'session-id'}, ddpMessage);
        Apm.tracer.event(traceInfo, 'start', {abc: 100});

        var eventId = Apm.tracer.event(traceInfo, 'db');
        Apm.tracer.event(traceInfo, 'db');
        Apm.tracer.eventEnd(traceInfo, 'invalid-eventId');

        Apm.tracer.event(traceInfo, 'end', {abc: 200});
        emit('return', traceInfo);
      });

      delete traceInfo._lastEventId;
      removeDate(traceInfo);
      
      assert.deepEqual(traceInfo, {
        _id: 'session-id::the-id',
        id: 'the-id',
        session: 'session-id',
        type: 'method',
        name: 'method-name',
        events: [
          {type: 'start', data: {abc: 100}},
          {type: 'db'},
          {type: 'end', data: {abc: 200}}
        ]
      });

      done();
  });

  test('trace-end-last-event', function(done, server) {
      var traceInfo = server.evalSync(function() {
        var ddpMessage = {
          id: 'the-id',
          msg: 'method',
          method: 'method-name'
        };

        var traceInfo = Apm.tracer.start({id: 'session-id'}, ddpMessage);
        Apm.tracer.event(traceInfo, 'start', {abc: 100});

        var eventId = Apm.tracer.event(traceInfo, 'db');
        Apm.tracer.event(traceInfo, 'db');
        Apm.tracer.endLastEvent(traceInfo);

        Apm.tracer.event(traceInfo, 'end', {abc: 200});
        emit('return', traceInfo);
      });

      delete traceInfo._lastEventId;
      removeDate(traceInfo);
      
      assert.deepEqual(traceInfo, {
        _id: 'session-id::the-id',
        id: 'the-id',
        session: 'session-id',
        type: 'method',
        name: 'method-name',
        events: [
          {type: 'start', data: {abc: 100}},
          {type: 'db'},
          {type: 'dbend'},
          {type: 'end', data: {abc: 200}}
        ]
      });

      done();
  });

  suite('buildTrace', function() {
    test('simple', function(done, server) {
      var traceInfo = server.evalSync(function() {
        var now = Date.now();
        var traceInfo = {
          events: [
            {type: 'start', at: now},
            {type: 'wait', at: now},
            {type: 'waitend', at: now + 1000},
            {type: 'db', at: now + 2000},
            {type: 'dbend', at: now + 2500},
            {type: 'complete', at: now + 2500}
          ]
        };

        Apm.tracer.buildTrace(traceInfo);
        emit('return', traceInfo);
      });

      assert.deepEqual(traceInfo.metrics, {
        total: 2500,
        wait: 1000,
        db: 500,
        compute: 1000,
      });
      assert.equal(traceInfo.errored, false);
      done();
    });

    test('errored', function(done, server) {
      var traceInfo = server.evalSync(function() {
        var now = Date.now();
        var traceInfo = {
          events: [
            {type: 'start', at: now},
            {type: 'wait', at: now},
            {type: 'waitend', at: now + 1000},
            {type: 'db', at: now + 2000},
            {type: 'dbend', at: now + 2500},
            {type: 'error', at: now + 2500}
          ]
        };

        Apm.tracer.buildTrace(traceInfo);
        emit('return', traceInfo);
      });

      assert.deepEqual(traceInfo.metrics, {
        total: 2500,
        wait: 1000,
        db: 500,
        compute: 1000,
      });
      assert.equal(traceInfo.errored, true);
      done();
    });

    test('no-start', function(done, server) {
      var traceInfo = server.evalSync(function() {
        var now = Date.now();
        var traceInfo = {
          events: [
            {type: 'wait', at: now},
            {type: 'waitend', at: now + 1000},
            {type: 'db', at: now + 2000},
            {type: 'dbend', at: now + 2500},
            {type: 'complete', at: now + 2500}
          ]
        };

        Apm.tracer.buildTrace(traceInfo);
        emit('return', traceInfo);
      });

      assert.deepEqual(traceInfo.metrics, undefined);
      done();
    });

    test('no-complete', function(done, server) {
      var traceInfo = server.evalSync(function() {
        var now = Date.now();
        var traceInfo = {
          events: [
            {type: 'start', at: now},
            {type: 'wait', at: now},
            {type: 'waitend', at: now + 1000},
            {type: 'db', at: now + 2000},
            {type: 'dbend', at: now + 2500}
          ]
        };

        Apm.tracer.buildTrace(traceInfo);
        emit('return', traceInfo);
      });

      assert.deepEqual(traceInfo.metrics, undefined);
      done();
    });

    test('event-not-ended', function(done, server) {
      var traceInfo = server.evalSync(function() {
        var now = Date.now();
        var traceInfo = {
          events: [
            {type: 'start', at: now},
            {type: 'wait', at: now},
            {type: 'db', at: now + 2000},
            {type: 'dbend', at: now + 2500},
            {type: 'complete', at: now + 2500}
          ]
        };

        Apm.tracer.buildTrace(traceInfo);
        emit('return', traceInfo);
      });

      assert.deepEqual(traceInfo.metrics, undefined);
      done();
    });
  });
});

function removeDate(traceInfo) {
  traceInfo.events.forEach(function(event) {
    delete event.at;
  });
}