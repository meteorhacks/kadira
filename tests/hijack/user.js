
Tinytest.add(
  'User (not logged in)',
  function (test) {
    EnableTrackingMethods();
    var methodId = RegisterMethod(function () {
      TestData.insert({aa: 10});
    });
    var client = GetMeteorClient();
    var result = client.call(methodId);
    var events = GetLastMethodEvents();
    console.log(events);
    // test.equal(result, [
    // ]);
    CleanTestData('methodstore', 'testdata');
  }
);
