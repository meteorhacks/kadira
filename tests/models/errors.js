
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
    var trace = {type: '_type', name: '_name'};
    model.trackError(error, trace);
    var metrics = model.buildPayload().errors;
    test.isTrue(Array.isArray(metrics));
    test.equal(metrics.length, 1);
    var payload = metrics[0];
    var expected = {
      appId: '_appId',
      name: '_message',
      source: '_type:_name',
      // startTime: Date.now(),
      type: 'server',
      trace: trace,
      stacks: [{stack: '_stack'}],
      count: 1,
    };
    test.equal(typeof payload.startTime, 'number');
    delete payload.startTime;
    test.equal(payload, expected);
  }
);

Tinytest.add(
  'Models - Errors - same error',
  function (test) {
    var model = new ErrorModel('_appId');
    var error = {name: '_name', message: '_message', stack: '_stack'};
    var trace = {type: '_type', name: '_name'};
    model.trackError(error, trace);
    model.trackError(error, trace);
    model.trackError(error, trace);
    var metrics = model.buildPayload().errors;
    test.isTrue(Array.isArray(metrics));
    test.equal(metrics.length, 1);
    var payload = metrics[0];
    var expected = {
      appId: '_appId',
      name: '_message',
      source: '_type:_name',
      // startTime: Date.now(),
      type: 'server',
      trace: trace,
      stacks: [{stack: '_stack'}],
      count: 3,
    };
    test.equal(typeof payload.startTime, 'number');
    delete payload.startTime;
    test.equal(payload, expected);
  }
);

Tinytest.add(
  'Models - Errors - different errors',
  function (test) {
    var model = new ErrorModel('_appId');
    [1, 2, 3].forEach(function(n) {
      var error = {name: '_name'+n, message: '_message'+n, stack: '_stack'+n};
      var trace = {type: '_type'+n, name: '_name'+n};
      model.trackError(error, trace);
    });

    var metrics = model.buildPayload().errors;
    test.isTrue(Array.isArray(metrics));
    test.equal(metrics.length, 3);

    [1, 2, 3].forEach(function(n) {
      var payload = metrics[n-1];
      var trace = {type: '_type'+n, name: '_name'+n};
      var expected = {
        appId: '_appId',
        name: '_message'+n,
        source: '_type'+n+':_name'+n,
        // startTime: Date.now(),
        type: 'server',
        trace: trace,
        stacks: [{stack: '_stack'+n}],
        count: 1,
      };
      test.equal(typeof payload.startTime, 'number');
      delete payload.startTime;
      test.equal(payload, expected);
    });
  }
);
