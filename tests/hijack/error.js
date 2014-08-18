
Tinytest.add(
  'Errors - Meteor._debug - track with Meteor._debug',
  function (test) {
    Kadira.models.error = new ErrorModel('foo');
    Meteor._debug('_debug', '_stack');
    var payload = Kadira.models.error.buildPayload();
    var error = payload.errors[0];
    var expected = {
      appId: "foo",
      name: "_debug",
      source: "server-missed:_debug",
      // startTime: 1408098721327,
      type: "server",
      trace: {
        type: "server-missed",
        name: "_debug",
        errored: true,
        // at: 1408098721326,
        events: [
          ["start", 0, {}],
          ["error", 0, {error: {message: "_debug", stack: "_stack"}}]
        ],
        metrics: {total: 0}
      },
      stacks: [{stack: "_stack"}],
      count: 1
    }

    delete error.startTime;
    delete error.trace.at;
    test.equal(expected, error);
  }
);

Tinytest.add(
  'Errors - Meteor._debug - do not track method errors',
  function (test) {
    Kadira.models.error = new ErrorModel('foo');
    var method = RegisterMethod(causeError);
    var client = GetMeteorClient();

    try {
      var result = client.call(method);
    } catch (e) {
      // ignore the error
    }

    var payload = Kadira.models.error.buildPayload();
    var error = payload.errors[0];
    test.equal(1, payload.errors.length);
    test.equal(error.source, 'method:'+method);

    function causeError () {
      HTTP.call('POST', 'localhost', Function());
    }
  }
);

Tinytest.add(
  'Errors - Meteor._debug - do not track pubsub errors',
  function (test) {
    Kadira.models.error = new ErrorModel('foo');
    var pubsub = RegisterPublication(causeError);
    var client = GetMeteorClient();
    var result = client.subscribe(pubsub, {onError: function () {
      var payload = Kadira.models.error.buildPayload();
      var error = payload.errors[0];
      test.equal(1, payload.errors.length);
      test.equal(error.source, 'sub:'+pubsub);
    }});

    function causeError () {
      HTTP.call('POST', 'localhost', Function());
    }
  }
);
