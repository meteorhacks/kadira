var Future = Npm.require('fibers/future');

Tinytest.add(
  'Subscriptions - Sub/Unsub - subscribe only',
  function (test) {
    CleanTestData();
    EnableTrackingMethods();
    var client = GetMeteorClient();

    var h1 = SubscribeAndWait(client, 'tinytest-data');
    var h2 = SubscribeAndWait(client, 'tinytest-data');

    var metrics = GetPubSubMetrics();
    test.equal(metrics.length, 1);
    test.equal(metrics[0].pubs['tinytest-data'].subs, 2);
    h1.stop();
    h2.stop();
    CloseClient(client);
  }
);


Tinytest.add(
  'Subscriptions - Sub/Unsub - subscribe and unsubscribe',
  function (test) {
    CleanTestData();
    EnableTrackingMethods();
    var client = GetMeteorClient();

    var h1 = SubscribeAndWait(client, 'tinytest-data');
    var h2 = SubscribeAndWait(client, 'tinytest-data');
    h1.stop();
    h2.stop();
    Wait(100);

    var metrics = GetPubSubMetrics();
    test.equal(metrics.length, 1);
    test.equal(metrics[0].pubs['tinytest-data'].subs, 2);
    test.equal(metrics[0].pubs['tinytest-data'].unsubs, 2);
    CloseClient(client);
  }
);

Tinytest.add(
  'Subscriptions - Response Time - single',
  function (test) {
    CleanTestData();
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
    CloseClient(client);
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
    CleanTestData();
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
    CloseClient(client);
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
    CleanTestData();
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
    CloseClient(client);
  }
);

Tinytest.add(
  'Network Impact - added',
  function (test) {
    CleanTestData();
    EnableTrackingMethods();
    var docs = [{data: 'data1'}, {data: 'data2'}];
    docs.forEach(function(doc) {TestData.insert(doc)});
    var client = GetMeteorClient();
    var h1 = SubscribeAndWait(client, 'tinytest-data');
    Wait(200);
    var metrics = GetPubSubMetrics();
    test.equal(metrics[0].pubs['tinytest-data'].bytesBeforeReady, GetDataSize(docs));
    h1.stop();
    CloseClient(client);
  }
);

Tinytest.add(
  'Network Impact - added in async',
  function (test) {
    CleanTestData();
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
    var h1 = SubscribeAndWait(client, publicationId);

    Wait(200);
    var metrics = GetPubSubMetrics();
    test.equal(metrics[0].pubs[publicationId].bytesBeforeReady, GetDataSize(docs));
    h1.stop();
    CloseClient(client);
  }
);

Tinytest.add(
  'Network Impact - added multi subscriptions',
  function (test) {
    CleanTestData();
    EnableTrackingMethods();
    var docs = [{data: 'data1'}, {data: 'data2'}];
    docs.forEach(function(doc) {TestData.insert(doc)});
    var client = GetMeteorClient();

    var h1 = SubscribeAndWait(client, 'tinytest-data');
    var h2 = SubscribeAndWait(client, 'tinytest-data');

    Wait(200);
    var metrics = GetPubSubMetrics();
    test.equal(metrics[0].pubs['tinytest-data'].bytesBeforeReady, GetDataSize(docs));
    h1.stop();
    h2.stop();
    CloseClient(client);
  }
);

Tinytest.add(
  'Network Impact - after ready - added',
  function (test) {
    CleanTestData();
    EnableTrackingMethods();
    var post1 = {abc: 10};
    var post2 = {abc: "hello sumba", aa: 200};
    TestData.insert(post1);
    var client = GetMeteorClient();
    var h1 = SubscribeAndWait(client, 'tinytest-data');
    TestData.insert(post2);

    Wait(200);
    var metrics = GetPubSubMetrics();
    test.equal(metrics[0].pubs['tinytest-data'].bytesBeforeReady, GetDataSize(post1));
    test.equal(metrics[0].pubs['tinytest-data'].bytesAddedAfterReady, GetDataSize(post2));
    test.equal(metrics[0].pubs['tinytest-data'].bytesChangedAfterReady, 0);
    h1.stop();
    CloseClient(client);
  }
);

Tinytest.add(
  'Network Impact - after ready - changed',
  function (test) {
    CleanTestData();
    EnableTrackingMethods();
    var post1 = {abc: 10};
    var post2 = {abc: 200};
    TestData.insert(post1);
    var client = GetMeteorClient();
    var h1 = SubscribeAndWait(client, 'tinytest-data');
    TestData.update({abc: 10}, {$set: post2});

    Wait(200);
    var metrics = GetPubSubMetrics();
    test.equal(metrics[0].pubs['tinytest-data'].bytesBeforeReady, GetDataSize(post1));
    test.equal(metrics[0].pubs['tinytest-data'].bytesAddedAfterReady, 0);
    test.equal(metrics[0].pubs['tinytest-data'].bytesChangedAfterReady, GetDataSize(post2));
    h1.stop();
    CloseClient(client);
  }
);

Tinytest.add(
  'Network Impact - after ready - added and changed',
  function (test) {
    CleanTestData();
    EnableTrackingMethods();
    var post1 = {abc: 10};
    var post2 = {abc: 200};
    var post3 = {abc: 200};
    TestData.insert(post1);
    var client = GetMeteorClient();
    var h1 = SubscribeAndWait(client, 'tinytest-data');
    TestData.update({abc: 10}, {$set: post2});
    TestData.insert(post3);

    Wait(200);
    var metrics = GetPubSubMetrics();
    test.equal(metrics[0].pubs['tinytest-data'].bytesBeforeReady, GetDataSize(post1));
    test.equal(metrics[0].pubs['tinytest-data'].bytesAddedAfterReady, GetDataSize(post3));
    test.equal(metrics[0].pubs['tinytest-data'].bytesChangedAfterReady, GetDataSize(post2));
    h1.stop();
    CloseClient(client);
  }
);

Tinytest.add(
  'Network Impact - removed',
  function (test) {
    CleanTestData();
    EnableTrackingMethods();
    var docs = [{abc: 10}];
    TestData.insert({_id: 'aa', abc: 10});
    var client = GetMeteorClient();
    var h1 = SubscribeAndWait(client, 'tinytest-data');
    TestData.remove({_id: 'aa'});

    Wait(200);
    var metrics = GetPubSubMetrics();
    test.equal(metrics[0].pubs['tinytest-data'].bytesBeforeReady, GetDataSize(docs));
    test.equal(metrics[0].pubs['tinytest-data'].bytesAddedAfterReady, 0);
    test.equal(metrics[0].pubs['tinytest-data'].bytesChangedAfterReady, 0);
    h1.stop();
    CloseClient(client);
  }
);

Tinytest.add(
  'Subscriptions - avoiding multiple ready',
  function (test) {
    CleanTestData();
    EnableTrackingMethods();
    ReadyCounts = 0;
    var pubId = RegisterPublication(function () {
      this.ready();
      this.ready();
    });
    Kadira.models.pubsub._trackReady = function(session, sub) {
      if(sub._name == pubId) {
        ReadyCounts++;
      }
    };
    var client = GetMeteorClient();
    var h1 = SubscribeAndWait(client, pubId);

    test.equal(ReadyCounts, 1);
    CloseClient(client);
  }
);

Tinytest.add(
  'Subscriptions - Observer Cache - single publication and single subscription',
  function (test) {
    CleanTestData();
    EnableTrackingMethods();
    var client = GetMeteorClient();
    var h1 = SubscribeAndWait(client, 'tinytest-data');

    Wait(100);
    var metrics = GetPubSubPayload();
    test.equal(metrics[0].pubs['tinytest-data'].totalObservers, 1);
    test.equal(metrics[0].pubs['tinytest-data'].cachedObservers, 0);
    test.equal(metrics[0].pubs['tinytest-data'].avgObserverReuse, 0);

    h1.stop();
    CloseClient(client);
  }
);

Tinytest.add(
  'Subscriptions - Observer Cache - single publication and multiple subscriptions',
  function (test) {
    CleanTestData();
    EnableTrackingMethods();
    var client = GetMeteorClient();

    var h1 = SubscribeAndWait(client, 'tinytest-data');
    var h2 = SubscribeAndWait(client, 'tinytest-data');

    Wait(100);
    var metrics = GetPubSubPayload();
    test.equal(metrics[0].pubs['tinytest-data'].totalObservers, 2);
    test.equal(metrics[0].pubs['tinytest-data'].cachedObservers, 1);
    test.equal(metrics[0].pubs['tinytest-data'].avgObserverReuse, 0.5);
    h1.stop();
    h2.stop();
    CloseClient(client);
  }
);

Tinytest.add(
  'Subscriptions - Observer Cache - multiple publication and multiple subscriptions',
  function (test) {
    CleanTestData();
    EnableTrackingMethods();
    var client = GetMeteorClient();
    var h1 = SubscribeAndWait(client, 'tinytest-data');
    var h2 = SubscribeAndWait(client, 'tinytest-data-2');

    Wait(100);
    var metrics = GetPubSubPayload();
    test.equal(metrics[0].pubs['tinytest-data'].totalObservers, 1);
    test.equal(metrics[0].pubs['tinytest-data'].cachedObservers, 0);
    test.equal(metrics[0].pubs['tinytest-data'].avgObserverReuse, 0);

    test.equal(metrics[0].pubs['tinytest-data-2'].totalObservers, 1);
    test.equal(metrics[0].pubs['tinytest-data-2'].cachedObservers, 1);
    test.equal(metrics[0].pubs['tinytest-data-2'].avgObserverReuse, 1);
    h1.stop();
    h2.stop();
    CloseClient(client);
  }
);