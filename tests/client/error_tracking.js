
Tinytest.add(
  'Client Side - Error Manager - Disabled by default',
  function (test) {
    test.equal(typeof Kadira.syncedData, 'undefined');
    test.equal(typeof Kadira.send, 'undefined');
    test.equal(typeof Kadira.errors, 'undefined');
  }
);

Tinytest.add(
  'Client Side - Error Manager - Enable with function',
  function (test) {
    enableErrorTracking();
    test.equal(typeof Kadira.syncedDate, 'object');
    test.equal(typeof Kadira.send, 'function');
    test.equal(typeof Kadira.errors, 'object');
  }
);
