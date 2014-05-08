Tinytest.add(
  'Tracer - trace-method',
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
    test.equal(traceInfo, {
      _id: 'session-id::the-id',
      id: 'the-id',
      session: 'session-id',
      userId: "uid",
      type: 'method',
      name: 'method-name',
      events: [
        ['start', 0, {abc: 100}],
        ['end', 0, {abc: 200}]
      ]
    });
  }
);

function removeDate (traceInfo) {
  traceInfo.events.forEach(function (event) {
    event[1] = 0;
  });
}
