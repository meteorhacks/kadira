
Tinytest.add(
  'Models - System - buildPayload',
  function (test) {
    var beforeTime = (new Date).getTime();
    var model = new SystemModel();
    wrapAsync(function(callback) {
      setTimeout(callback, 1000);
    })();
    var payload = model.buildPayload().systemMetrics[0];

    test.isTrue(payload.memory > 0);
    test.isTrue(payload.pcpu >= 0);
    test.isTrue(payload.sessions >= 0);
    test.isTrue(payload.endTime >= payload.startTime + 1000);
  }
);
