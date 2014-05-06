
Tinytest.add(
  'Async - track with Meteor._wrapAsync',
  function (test) {
    EnableTrackingMethods();
    var methodId = RegisterMethod(function () {
      var wait = Meteor._wrapAsync(function(waitTime, callback) {
        setTimeout(callback, waitTime);
      });
      wait(100);
    });
    var client = GetMeteorClient();
    var result = client.call(methodId);
    var events = GetLastMethodEvents([0]);
    var expected = [
      ['start'],
      ['wait'],
      ['async'],
      ['complete']
    ];
    test.equal(events, expected);
    CleanTestData('methodstore');
  }
);

Tinytest.add(
  'Async - track with Meteor._wrapAsync with error',
  function (test) {
    EnableTrackingMethods();
    var methodId = RegisterMethod(function () {
      var wait = Meteor._wrapAsync(function(waitTime, callback) {
        setTimeout(function () {
          callback(new Error('error'));
        }, waitTime);
      });
      try {
        wait(100);
      } catch (ex) {

      }
    });
    var client = GetMeteorClient();
    var result = client.call(methodId);
    var events = GetLastMethodEvents([0]);
    var expected = [
      ['start'],
      ['wait'],
      ['async'],
      ['complete']
    ];
    test.equal(events, expected);
    CleanTestData('methodstore');
  }
);

Tinytest.add(
  'Async - track with Async.wrap with error',
  function (test) {
    test.fail('Async not defined');
    // EnableTrackingMethods();
    // var methodId = RegisterMethod(function () {
    //   var wait = Async.wrap(function(waitTime, callback) {
    //     setTimeout(function () {
    //       callback(new Error('error'));
    //     }, waitTime);
    //   });
    //   try {
    //     wait(100);
    //   } catch (ex) {

    //   }
    // });
    // var client = GetMeteorClient();
    // var result = client.call(methodId);
    // var events = GetLastMethodEvents([0]);
    // var expected = [
    //   ['start'],
    //   ['wait'],
    //   ['async'],
    //   ['complete']
    // ];
    // test.equal(events, expected);
    // CleanTestData('methodstore');
  }
);

Tinytest.add(
  'Async - track with Async.wrap with error and continue',
  function (test) {
    test.fail('Async not defined');
    // EnableTrackingMethods();
    // var methodId = RegisterMethod(function () {
    //   var wait = Async.wrap(function(waitTime, callback) {
    //     setTimeout(function () {
    //       callback(new Error('error'));
    //     }, waitTime);
    //   });
    //   try {
    //     wait(100);
    //   } catch (ex) {

    //   }
    //   TestData.find({}).fetch();
    // });
    // var client = GetMeteorClient();
    // var result = client.call(methodId);
    // var events = GetLastMethodEvents([0, 2]);
    // var expected = [
    //   ['start',, {userId: null, params: '[]'}],
    //   ['wait',, {waitOn: []}],
    //   ['async',, {}],
    //   ['db',, {coll: 'tinytest-data', func: 'find', selector: JSON.stringify({})}],
    //   ['db',, {coll: 'tinytest-data', func: 'fetch', cursor: true, selector: JSON.stringify({}), docsFetched: 0}],
    //   ['complete']
    // ];
    // test.equal(events, expected);
    // CleanTestData('methodstore', 'testdata');
  }
);
