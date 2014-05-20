Tinytest.add(
  'Tracer - Trace Method - method',
  function (test) {
    var ddpMessage = {
      id: 'the-id',
      msg: 'method',
      method: 'method-name'
    };
    var traceInfo = Apm.tracer.start({id: 'session-id', userId: 'uid'}, ddpMessage);
    Apm.tracer.event(traceInfo, 'start', {abc: 100});
    Apm.tracer.event(traceInfo, 'end', {abc: 200});
    removeDate(traceInfo);
    var expected = {
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
    };
    test.equal(traceInfo, expected);
  }
);

Tinytest.add(
  'Tracer - Trace Method - complete after errored',
  function (test) {
    var ddpMessage = {
      id: 'the-id',
      msg: 'method',
      method: 'method-name'
    };
    var traceInfo = Apm.tracer.start({id: 'session-id', userId: 'uid'}, ddpMessage);
    Apm.tracer.event(traceInfo, 'start');
    Apm.tracer.event(traceInfo, 'error');
    Apm.tracer.event(traceInfo, 'complete');
    removeDate(traceInfo);
    var expected = {
      _id: 'session-id::the-id',
      id: 'the-id',
      session: 'session-id',
      userId: "uid",
      type: 'method',
      name: 'method-name',
      events: [
        {type: 'start'},
        {type: 'error'}
      ],
    };
    test.equal(traceInfo, expected);
  }
);

Tinytest.add(
  'Tracer - trace sub',
  function (test) {
    var ddpMessage = {
      id: 'the-id',
      msg: 'sub',
      name: 'sub-name'
    };
    var traceInfo = Apm.tracer.start({id: 'session-id'}, ddpMessage);
    Apm.tracer.event(traceInfo, 'start', {abc: 100});
    Apm.tracer.event(traceInfo, 'end', {abc: 200});
    removeDate(traceInfo);
    var expected = {
      _id: 'session-id::the-id',
      session: 'session-id',
      id: 'the-id',
      events: [
        {type: 'start', data: {abc: 100}},
        {type: 'end', data: {abc: 200}}
      ],
      type: 'sub',
      name: 'sub-name'
    };
    delete traceInfo.userId;
    test.equal(traceInfo, expected);
  }
);

Tinytest.add(
  'Tracer - trace other ddp',
  function (test) {
    var ddpMessage = {
      id: 'the-id',
      msg: 'unsub',
      name: 'sub-name'
    };
    var traceInfo = Apm.tracer.start({id: 'session-id'}, ddpMessage);
    test.equal(traceInfo, null);
  }
);

Tinytest.add(
  'Tracer - trace other events',
  function (test) {
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
    removeDate(traceInfo);
    var expected = {
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
    };
    delete traceInfo.userId;
    test.equal(traceInfo, expected);
  }
);

Tinytest.add(
  'Tracer - invalid eventId',
  function (test) {
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
    delete traceInfo._lastEventId;
    removeDate(traceInfo);
    var expected = {
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
    };
    delete traceInfo.userId;
    test.equal(traceInfo, expected);
  }
);

Tinytest.add(
  'Tracer - end last event',
  function (test) {
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
    delete traceInfo._lastEventId;
    removeDate(traceInfo);
    var expected = {
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
    };
    delete traceInfo.userId;
    test.equal(traceInfo, expected);
  }
);

Tinytest.add(
  'Tracer - trace same event twice',
  function (test) {
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
    removeDate(traceInfo);
    var expected = {
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
    };
    delete traceInfo.userId;
    test.equal(traceInfo, expected);
  }
);

Tinytest.add(
  'Tracer - Build Trace - simple',
  function (test) {
    var now = (new Date).getTime();
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
    test.equal(traceInfo.metrics, {
      total: 2500,
      wait: 1000,
      db: 500,
      compute: 1000,
    });
    test.equal(traceInfo.errored, false);
  }
);

Tinytest.add(
  'Tracer - Build Trace - errored',
  function (test) {
    var now = (new Date).getTime();
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
    test.equal(traceInfo.metrics, {
      total: 2500,
      wait: 1000,
      db: 500,
      compute: 1000,
    });
    test.equal(traceInfo.errored, true);
  }
);

Tinytest.add(
  'Tracer - Build Trace - no start',
  function (test) {
    var now = (new Date).getTime();
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
    test.equal(traceInfo.metrics, undefined);
  }
);

Tinytest.add(
  'Tracer - Build Trace - no complete',
  function (test) {
    var now = (new Date).getTime();
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
    test.equal(traceInfo.metrics, undefined);
  }
);

Tinytest.add(
  'Tracer - Build Trace - event not ended',
  function (test) {
    var now = (new Date).getTime();
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
    test.equal(traceInfo.metrics, undefined);
  }
);

function removeDate(traceInfo) {
  traceInfo.events.forEach(function(event) {
    delete event.at;
  });
}
