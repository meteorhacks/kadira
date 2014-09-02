
Tinytest.add(
  'Client Side - Error Manager - enableErrorTracking',
  function (test) {
    var originalErrorTrackingStatus = Kadira.options.enableErrorTracking;
    Kadira.enableErrorTracking();
    test.equal(Kadira.options.enableErrorTracking, true);
    _resetErrorTracking(originalErrorTrackingStatus);
  }
);

Tinytest.add(
  'Client Side - Error Manager - disableErrorTracking',
  function (test) {
    var originalErrorTrackingStatus = Kadira.options.enableErrorTracking;
    Kadira.disableErrorTracking();
    test.equal(Kadira.options.enableErrorTracking, false);
    _resetErrorTracking(originalErrorTrackingStatus);
  }
);

function _resetErrorTracking (status) {
  if(status) {
    Kadira.enableErrorTracking();
  } else {
    Kadira.disableErrorTracking();
  }
}
