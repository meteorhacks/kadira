
Tinytest.add(
  'Models - System - buildPayload',
  function (test) {
    var beforeTime = (new Date).getTime();
    var model = new SystemModel();
    Meteor._wrapAsync(function(callback) {
      setTimeout(callback, 1000);
    })();
    var payload = model.buildPayload().systemMetrics[0];
    test.isTrue(payload.memory > 0);
    test.isTrue(payload.loadAverage > 0);
    test.isTrue(payload.eventLoopCount > 0);
    test.isTrue(payload.sessions >= 0);
    test.isTrue(payload.startTime >= beforeTime);
    test.isTrue(payload.endTime >= payload.startTime + 1000);
    test.isTrue(payload.totalTime >= 1000);
    test.isTrue(payload.eventLoopTime <= 1000);
  }
);
