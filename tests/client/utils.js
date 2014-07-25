
Tinytest.add(
  'Client Side - Error Manager - Utils - stackFramesFilter()',
  function (test) {
    test.equal(typeof stackFramesFilter, 'function');
    test.equal(stackFramesFilter('/packages/zones/assets/zone.js'), false);
    test.equal(stackFramesFilter('/packages/foo/bar.js'), true);
  }
);
