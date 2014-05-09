
Tinytest.add(
  'Subscriptions - Sub/Unsub - subscribe only',
  function (test) {
    EnableTrackingMethods();
    var client = GetMeteorClient();
    var Future = Npm.require('fibers/future');
    var f = new Future();
    var h1, h2;
    h1 = client.subscribe('tinytest-data', function() {
      h2 = client.subscribe('tinytest-data', function() {
        setTimeout(function () {
          f.return();
        }, 100);
      });
    });
    f.wait();
    var metrics = GetPubSubMetrics();
    test.equal(metrics.length, 1);
    test.equal(metrics[0].pubs['tinytest-data'].subs, 2);
    h1.stop();
    h2.stop();
    CleanTestData();
  }
);

Tinytest.add(
  'Subscriptions - Sub/Unsub - subscribe and unsubscribe',
  function (test) {
    EnableTrackingMethods();
    var client = GetMeteorClient();
    var Future = Npm.require('fibers/future');
    var f = new Future();
    var h1, h2;
    h1 = client.subscribe('tinytest-data', function() {
      h2 = client.subscribe('tinytest-data', function() {
        h1.stop();
        h2.stop();
        setTimeout(function () {
          f.return();
        }, 100);
      });
    });
    f.wait();
    var metrics = GetPubSubMetrics();
    test.equal(metrics.length, 1);
    test.equal(metrics[0].pubs['tinytest-data'].subs, 2);
    test.equal(metrics[0].pubs['tinytest-data'].unsubs, 2);
    CleanTestData();
  }
);

Tinytest.add(
  'Subscriptions - Response Time - single',
  function (test) {
    var client = GetMeteorClient();
    var Future = Npm.require('fibers/future');
    var pubName = "pub-" + Random.id();
    Meteor.publish(pubName, function() {
      Wait(200);
      this.ready();
    });
    var h1 = SubscribeAndWait(client, pubName);
    var metrics = FindMetricsForPub(pubName);
    test.isTrue(CompareNear(metrics.resTime, 200, 100));
    h1.stop();
  }
);

// Tinytest.add(
//   'Subscriptions - Response Time - multiple',
//   function (test) {
//     EnableTrackingMethods();
//     var client = GetMeteorClient();
//     var Future = Npm.require('fibers/future');
//     var f = new Future();
//     var h1, h2;
//     h1 = client.subscribe('tinytest-data-multi', function() {
//       console.log('+++++++')
//       f.return();
//     });
//     f.wait();
//     var metrics = GetPubSubPayload();
//     var resTimeOne = metrics[0].pubs['tinytest-data-multi'].resTime;
//     Wait(700);
//     var H2_SUB;
//     h2 = client.subscribe('tinytest-data-multi');
//     Wait(300);
//     var metrics2 = GetPubSubPayload();
//     var resTimeTwo = metrics2[0].pubs['tinytest-data-multi'].resTime;
//     test.isTrue(resTimeTwo == 0);
//     h1.stop();
//     h2.stop();
//     console.log('---------', resTimeTwo);
//     CleanTestData();
//   }
// );

Tinytest.add(
  'Subscriptions - Lifetime - sub',
  function (test) {
    EnableTrackingMethods();
    var client = GetMeteorClient();
    var Future = Npm.require('fibers/future');
    var f = new Future();
    var h1 = SubscribeAndWait(client, 'tinytest-data');
    Wait(100);
    h1.stop();
    Wait(100);
    var metrics = FindMetricsForPub('tinytest-data');
    test.isTrue(CompareNear(metrics.lifeTime, 100));
    CleanTestData();
  }
);

// // Tinytest.add(
// //   'Subscriptions - Lifetime - null sub',
// //   function (test) {
// //     // test.fail('no pubs for null(autopublish)');
// //     // EnableTrackingMethods();
// //     // var client = GetMeteorClient();
// //     // var Future = Npm.require('fibers/future');
// //     // var f = new Future();
// //     // var interval = setInterval(function () {
// //     //   if (client.status().connected) {
// //     //     clearInterval(interval);
// //     //     f.return();
// //     //   };
// //     // }, 50);
// //     // f.wait();
// //     // Wait(600);
// //     // client.disconnect();
// //     // var metrics = GetPubSubMetrics();
// //     // test.equal(metrics[0].pubs['null(autopublish)'].lifeTime > 600, true);
// //     // CleanTestData();
// //   }
// // );

Tinytest.add(
  'Subscriptions - active subs',
  function (test) {
    EnableTrackingMethods();
    var client = GetMeteorClient();
    var Future = Npm.require('fibers/future');
    var f = new Future();
    var h1 = SubscribeAndWait(client, 'tinytest-data');
    var h2 = SubscribeAndWait(client, 'tinytest-data');
    var h3 = SubscribeAndWait(client, 'tinytest-data-2');

    var payload = GetPubSubPayload();
    test.equal(payload[0].pubs['tinytest-data'].activeSubs == 2, true);
    test.equal(payload[0].pubs['tinytest-data-2'].activeSubs == 1, true);
    h1.stop();
    h2.stop();
    h3.stop();
    CleanTestData();
  }
);

Tinytest.add(
  'Network Impact - added',
  function (test) {
    EnableTrackingMethods();
    var docs = [{data: 'data1'}, {data: 'data2'}];
    docs.forEach(function(doc) {TestData.insert(doc)});
    var client = GetMeteorClient();
    var Future = Npm.require('fibers/future');
    var f = new Future();
    var h1;
    h1 = client.subscribe('tinytest-data', function() {
      f.return();
    });
    f.wait();
    Wait(200);
    var metrics = GetPubSubMetrics();
    test.equal(metrics[0].pubs['tinytest-data'].bytesBeforeReady, GetDataSize(docs));
    h1.stop();
    CleanTestData();
  }
);

Tinytest.add(
  'Network Impact - added in async',
  function (test) {
    EnableTrackingMethods();
    var docs = [{data: 'data1'}, {data: 'data2'}];
    docs.forEach(function(doc) {TestData.insert(doc)});
    var publicationId = RegisterPublication(function () {
      var self = this;
      setTimeout(function() {
        self.added('posts', 'id1', {data: 'data1'})
        self.added('posts', 'id2', {data: 'data2'})
        self.ready();
      }, 200);
    })
    var client = GetMeteorClient();
    var Future = Npm.require('fibers/future');
    var f = new Future();
    var h1;
    h1 = client.subscribe(publicationId, function() {
      f.return();
    });
    f.wait();
    Wait(200);
    var metrics = GetPubSubMetrics();
    test.equal(metrics[0].pubs[publicationId].bytesBeforeReady, GetDataSize(docs));
    h1.stop();
    CleanTestData();
  }
);

Tinytest.add(
  'Network Impact - added multi subscriptions',
  function (test) {
    EnableTrackingMethods();
    var docs = [{data: 'data1'}, {data: 'data2'}];
    docs.forEach(function(doc) {TestData.insert(doc)});
    var client = GetMeteorClient();
    var Future = Npm.require('fibers/future');
    var f = new Future();
    var h1, h2;
    h1 = client.subscribe('tinytest-data', function() {
      h2 = client.subscribe('tinytest-data', function() {
        f.return();
      });
    });
    f.wait();
    Wait(200);
    var metrics = GetPubSubMetrics();
    test.equal(metrics[0].pubs['tinytest-data'].bytesBeforeReady, GetDataSize(docs));
    h1.stop();
    h2.stop();
    CleanTestData();
  }
);

Tinytest.add(
  'Network Impact - after ready',
  function (test) {
    EnableTrackingMethods();
    var post1 = {abc: 10};
    var post2 = {abc: "hello sumba", aa: 200};
    TestData.insert(post1);
    var client = GetMeteorClient();
    var Future = Npm.require('fibers/future');
    var f = new Future();
    var h1 = client.subscribe('tinytest-data', function() {
      f.return();
    });
    f.wait();
    TestData.insert(post2);
    Wait(200);
    var metrics = GetPubSubMetrics();
    test.equal(metrics[0].pubs['tinytest-data'].bytesBeforeReady, GetDataSize(post1));
    test.equal(metrics[0].pubs['tinytest-data'].bytesAfterReady, GetDataSize(post2));
    h1.stop();
    CleanTestData();
  }
);

Tinytest.add(
  'Network Impact - removed',
  function (test) {
    EnableTrackingMethods();
    var docs = [{abc: 10}];
    TestData.insert({_id: 'aa', abc: 10});
    var client = GetMeteorClient();
    var Future = Npm.require('fibers/future');
    var f = new Future();
    var h1;
    h1 = client.subscribe('tinytest-data', function() {
      f.return();
    });
    f.wait();
    TestData.remove({_id: 'aa'});
    Wait(200);
    var metrics = GetPubSubMetrics();
    test.equal(metrics[0].pubs['tinytest-data'].bytesBeforeReady, GetDataSize(docs));
    test.equal(metrics[0].pubs['tinytest-data'].bytesAfterReady, 0);
    h1.stop();
    CleanTestData();
  }
);

Tinytest.add(
  'Subscriptions - avoiding multiple ready',
  function (test) {
    EnableTrackingMethods();
    ReadyCounts = 0;
    var pubId = RegisterPublication(function () {
      this.ready();
      this.ready();
    });
    Apm.models.pubsub._trackReady = function(session, sub) {
      if(sub._name == pubId) {
        ReadyCounts++;
      }
    };
    var client = GetMeteorClient();
    var Future = Npm.require('fibers/future');
    var f = new Future();
    var h1 = client.subscribe(pubId, function() {
      f.return();
    });
    f.wait();
    h1.stop();
    test.equal(ReadyCounts, 1);
    CleanTestData();
  }
);

Tinytest.add(
  'Subscriptions - Observer Cache - single publication and single subscription',
  function (test) {
    EnableTrackingMethods();
    var client = GetMeteorClient();
    var Future = Npm.require('fibers/future');
    var f = new Future();
    var h1;
    h1 = client.subscribe('tinytest-data', function() {
      f.return();
    });
    f.wait();
    Wait(100);
    var metrics = GetPubSubMetrics();
    test.equal(metrics[0].pubs['tinytest-data'].totalObservers, 1);
    test.equal(metrics[0].pubs['tinytest-data'].cachedObservers, 0);
    h1.stop();
    CleanTestData();
  }
);

Tinytest.add(
  'Subscriptions - Observer Cache - single publication and multiple subscriptions',
  function (test) {
    EnableTrackingMethods();
    var client = GetMeteorClient();
    var Future = Npm.require('fibers/future');
    var f = new Future();
    var h1, h2;
    h1 = client.subscribe('tinytest-data', function() {
      h2 = client.subscribe('tinytest-data', function() {
        f.return();
      });
    });
    f.wait();
    Wait(100);
    var metrics = GetPubSubMetrics();
    test.equal(metrics[0].pubs['tinytest-data'].totalObservers, 2);
    test.equal(metrics[0].pubs['tinytest-data'].cachedObservers, 1);
    h1.stop();
    h2.stop();
    CleanTestData();
  }
);

Tinytest.add(
  'Subscriptions - Observer Cache - multiple publication and multiple subscriptions',
  function (test) {
    EnableTrackingMethods();
    var client = GetMeteorClient();
    var Future = Npm.require('fibers/future');
    var f = new Future();
    var h1, h2;
    h1 = client.subscribe('tinytest-data', function() {
      h2 = client.subscribe('tinytest-data-2', function() {
        f.return();
      });
    });
    f.wait();
    Wait(100);
    var metrics = GetPubSubMetrics();
    test.equal(metrics[0].pubs['tinytest-data'].totalObservers, 1);
    test.equal(metrics[0].pubs['tinytest-data'].cachedObservers, 0);
    test.equal(metrics[0].pubs['tinytest-data-2'].totalObservers, 1);
    test.equal(metrics[0].pubs['tinytest-data-2'].cachedObservers, 1);
    h1.stop();
    h2.stop();
    CleanTestData();
  }
);
