
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
    test.equal(typeof getNormalizedStacktrace, 'function');
    var expected = [
      '    at foo/bar.js:12:34',
      '    at funName (foo/bar.js:12:34)',
    ].join('\n');
    var original_printStackTrace = printStackTrace;
    printStackTrace = mock_printStackTrace;
    test.equal(expected, getNormalizedStacktrace());
    printStackTrace = original_printStackTrace;

    function mock_printStackTrace() {
      var o = getCurrentOrigin();
      return [
        '{anonymous}()@'+o+'/packages/zones/assets/bar.js:12:34',
        'funName@'+o+'/packages/zones/assets/bar.js:12:34',
        '{anonymous}()@'+o+'/foo/bar.js:12:34',
        'funName@'+o+'/foo/bar.js:12:34'
      ];
    }
  }
);
