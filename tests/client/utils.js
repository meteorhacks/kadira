
Tinytest.add(
  'Client Side - Error Manager - Utils - stackFramesFilter()',
  function (test) {
    test.equal(typeof stackFramesFilter, 'function');
    test.equal(stackFramesFilter('/packages/zones/assets/zone.js'), false);
    test.equal(stackFramesFilter('/packages/foo/bar.js'), true);
  }
);

Tinytest.add(
  'Client Side - Error Manager - Utils - getCurrentOrigin()',
  function (test) {
    test.equal(typeof getCurrentOrigin, 'function');
    // Simple regex to catch origin part of the url
    // (may not work for all cases but sufficient for tests)
    var regex = /^https?:\/\/[a-zA-Z0-9\.]+:?[0-9]*$/;
    var origin = getCurrentOrigin();
    test.equal(typeof origin, 'string');
    test.equal(!!origin.match(regex), true);
  }
);

Tinytest.add(
  'Client Side - Error Manager - Utils - formatTraceLine()',
  function (test) {
    test.equal(typeof formatTraceLine, 'function');
    var lines = [
      '{anonymous}()@'+getCurrentOrigin()+'/foo/bar.js:12:34',
      'funName@'+getCurrentOrigin()+'/foo/bar.js:12:34'
    ];
    var expected = [
      '    at foo/bar.js:12:34',
      '    at funName (foo/bar.js:12:34)',
    ];
    for(var i=lines.length; i-->0;) {
      test.equal(expected[i], formatTraceLine(lines[i]));
    }
  }
);

Tinytest.add(
  'Client Side - Error Manager - Utils - getNormalizedStacktrace()',
  function (test) {
    hijackPrintStackTrace(mock_printStackTrace);
    test.equal(typeof getNormalizedStacktrace, 'function');
    var expected = [
      '    at foo/bar.js:12:34',
      '    at funName (foo/bar.js:12:34)',
    ].join('\n');
    test.equal(expected, getNormalizedStacktrace());
    restorePrintStackTrace();
  }
);

Tinytest.add(
  'Client Side - Error Manager - Utils - getErrorStack()',
  function (test) {
    test.equal(typeof getErrorStack, 'function');
  }
);

Tinytest.add(
  'Client Side - Error Manager - Utils - getErrorStack() errored stack',
  function (test) {
    hijackPrintStackTrace(mock_printStackTrace);
    var zone = {
      erroredStack: {_e: new Error()}
    };
    var trace = getErrorStack(zone);
    test.equal(1, trace.length);
    test.equal('number', typeof trace[0].at);
    test.equal('string', typeof trace[0].stack);
    restorePrintStackTrace();
  }
);

Tinytest.add(
  'Client Side - Error Manager - Utils - getErrorStack() without events',
  function (test) {
    hijackPrintStackTrace(mock_printStackTrace);
    var stack = '    at foo/bar.js:12:34\n    at funName (foo/bar.js:12:34)';

    var zone = {
      id: 'foo',
      createdAt: 100,
      runAt: 200,
      owner: '_owner',
      currentStack: {_e: new Error()},
      erroredStack: {_e: new Error()},
      // eventMap: {}
    };

    var expected = {
      createdAt: 100,
      runAt: 200,
      stack: stack,
      owner: '_owner',
      ownerArgs: [],
      events: undefined,
      zoneId: 'foo'
    };

    var trace = getErrorStack(zone);
    test.equal(2, trace.length);
    test.equal('number', typeof trace[0].at);
    test.equal(stack, trace[0].stack);
    test.equal(expected, trace[1]);
    restorePrintStackTrace();
  }
);

Tinytest.add(
  'Client Side - Error Manager - Utils - getErrorStack() with stack',
  function (test) {
    hijackPrintStackTrace(mock_printStackTrace);
    var stack = '    at foo/bar.js:12:34\n    at funName (foo/bar.js:12:34)';

    var eventMap = {foo: [
      {type: 'owner-args', args: ['foo', 'bar'], at: 300},
      {type: '_type', args: ['bar', 'baz']},
    ]};

    var zone = {
      id: 'foo',
      createdAt: 100,
      runAt: 200,
      owner: '_owner',
      currentStack: {_e: new Error()},
      erroredStack: {_e: new Error()},
      eventMap: eventMap
    };

    var expected = {
      createdAt: 100,
      runAt: 300,
      stack: stack,
      owner: '_owner',
      ownerArgs: ['foo', 'bar'],
      events: [{type: '_type', args: ['bar', 'baz']}],
      zoneId: 'foo'
    };

    var trace = getErrorStack(zone);
    test.equal(2, trace.length);
    test.equal('number', typeof trace[0].at);
    test.equal(stack, trace[0].stack);
    test.equal(expected, trace[1]);
    restorePrintStackTrace();
  }
);

Tinytest.add(
  'Client Side - Error Manager - Utils - getErrorStack() with parent zone',
  function (test) {
    hijackPrintStackTrace(mock_printStackTrace);
    var stack = '    at foo/bar.js:12:34\n    at funName (foo/bar.js:12:34)';

    var eventMap = {
      foo: [
        {type: 'owner-args', args: ['foo', 'bar'], at: 300},
        {type: '_type', args: ['bar', 'baz']},
      ],
      bar: [
        {type: 'owner-args', args: ['foo2', 'bar2'], at: 310},
        {type: '_type2', args: ['bar2', 'baz2']},
      ]
    };

    var zone2 = {
      id: 'bar',
      createdAt: 110,
      runAt: 210,
      owner: '_owner2',
      currentStack: {_e: new Error()},
      erroredStack: {_e: new Error()},
    };

    var zone = {
      id: 'foo',
      createdAt: 100,
      runAt: 200,
      owner: '_owner',
      parent: zone2,
      currentStack: {_e: new Error()},
      erroredStack: {_e: new Error()},
      eventMap: eventMap
    };

    var expected = {
      createdAt: 100,
      runAt: 300,
      stack: stack,
      owner: '_owner',
      ownerArgs: ['foo', 'bar'],
      events: [{type: '_type', args: ['bar', 'baz']}],
      zoneId: 'foo'
    };

    var expected2 = {
      createdAt: 110,
      runAt: 310,
      stack: stack,
      owner: '_owner2',
      ownerArgs: ['foo2', 'bar2'],
      events: [{type: '_type2', args: ['bar2', 'baz2']}],
      zoneId: 'bar'
    };

    var trace = getErrorStack(zone);
    test.equal(3, trace.length);
    test.equal('number', typeof trace[0].at);
    test.equal(stack, trace[0].stack);
    test.equal(expected, trace[1]);
    test.equal(expected2, trace[2]);
    restorePrintStackTrace();
  }
);

Tinytest.add(
  'Client Side - Error Manager - Utils - getBrowserInfo() for guest',
  function (test) {
    test.equal(typeof getBrowserInfo, 'function');
    var info = getBrowserInfo();
    test.equal('string', typeof info.browser);
    test.equal('string', typeof info.url);
    test.equal(undefined, info.userId);
  }
);

Tinytest.add(
  'Client Side - Error Manager - Utils - getBrowserInfo() for users',
  function (test) {
    hijackMeteorUserId(mock_MeteorUserId);
    test.equal(typeof getBrowserInfo, 'function');
    var info = getBrowserInfo();
    test.equal('string', typeof info.browser);
    test.equal('string', typeof info.url);
    test.equal('string', typeof info.userId);
    restoreMeteorUserId();
  }
);

//--------------------------------------------------------------------------\\

var original_printStackTrace = printStackTrace;

function hijackPrintStackTrace(mock) {
  printStackTrace = mock;
}

function restorePrintStackTrace() {
  printStackTrace = original_printStackTrace;
}

function mock_printStackTrace() {
  var o = getCurrentOrigin();
  return [
    '{anonymous}()@'+o+'/packages/zones/assets/bar.js:12:34',
    'funName@'+o+'/packages/zones/assets/bar.js:12:34',
    '{anonymous}()@'+o+'/foo/bar.js:12:34',
    'funName@'+o+'/foo/bar.js:12:34'
  ];
}

var original_MeteorUserId = Meteor.userId;

function hijackMeteorUserId(mock) {
  Meteor.userId = mock;
}

function restoreMeteorUserId() {
  Meteor.userId = original_MeteorUserId;
}

function mock_MeteorUserId() {
  return Random.id();
}
