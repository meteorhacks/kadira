
Tinytest.add(
  'Models - Errors - empty',
  function (test) {
    var model = new ErrorModel('_appId');
    var metrics = model.buildPayload().errors;
    test.isTrue(Array.isArray(metrics));
    test.equal(metrics.length, 0);
  }
);

Tinytest.add(
  'Models - Errors - simple',
  function (test) {
    var model = new ErrorModel('_appId');
    var error = {name: '_name', message: '_message', stack: '_stack'};
    model.trackError(error, '_source');
    var metrics = model.buildPayload().errors;
    test.isTrue(Array.isArray(metrics));
    test.equal(metrics.length, 1);
    var payload = metrics[0];
    var expected = {
      appId : '_appId',
      name : '_name: _message',
      source : '_source',
      // startTime : now,
      type : 'server',
      stack : [{/*at: now, */events: [], stack: '_stack'}],
      count: 1,
    };
    test.isTrue(payload.startTime);
    test.equal(typeof payload.startTime, 'number');
    delete payload.startTime;
    test.isTrue(payload.stack[0].at);
    test.equal(typeof payload.stack[0].at, 'number');
    delete payload.stack[0].at;
    test.equal(payload, expected);
  }
);

Tinytest.add(
  'Models - Errors - same error',
  function (test) {
    var model = new ErrorModel('_appId');
    var error = {name: '_name', message: '_message', stack: '_stack'};
    model.trackError(error, '_source');
    model.trackError(error, '_source');
    model.trackError(error, '_source');
    var metrics = model.buildPayload().errors;
    test.isTrue(Array.isArray(metrics));
    test.equal(metrics.length, 1);
    var payload = metrics[0];
    var expected = {
      appId : '_appId',
      name : '_name: _message',
      source : '_source',
      // startTime : now,
      type : 'server',
      stack : [{/*at: now, */events: [], stack: '_stack'}],
      count: 3,
    };
    test.isTrue(payload.startTime);
    test.equal(typeof payload.startTime, 'number');
    delete payload.startTime;
    test.isTrue(payload.stack[0].at);
    test.equal(typeof payload.stack[0].at, 'number');
    delete payload.stack[0].at;
    test.equal(payload, expected);
  }
);

Tinytest.add(
  'Models - Errors - different errors',
  function (test) {
    var model = new ErrorModel('_appId');
    var error1 = {name: '_name1', message: '_message1', stack: '_stack1'};
    var error2 = {name: '_name2', message: '_message2', stack: '_stack2'};
    model.trackError(error1, '_source');
    model.trackError(error2, '_source');
    var metrics = model.buildPayload().errors;
    test.isTrue(Array.isArray(metrics));
    test.equal(metrics.length, 2);
    [1, 2].forEach(function (n) {
      var payload = metrics[n-1];
      var expected = {
        appId : '_appId',
        name : '_name'+n+': _message'+n,
        source : '_source',
        // startTime : now,
        type : 'server',
        stack : [{/*at: now, */events: [], stack: '_stack'+n}],
        count: 1,
      };
      test.isTrue(payload.startTime);
      test.equal(typeof payload.startTime, 'number');
      delete payload.startTime;
      test.isTrue(payload.stack[0].at);
      test.equal(typeof payload.stack[0].at, 'number');
      delete payload.stack[0].at;
      test.equal(payload, expected);
    });
  }
);
