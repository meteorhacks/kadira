Tinytest.add(
  'Models - PubSub - Metrics - same date',
  function (test) {
    var pub = "postsList";
    var d = new Date('2013 Dec 10 20:30').getTime();
    var model = new PubsubModel();
    model._getMetrics(d, pub).subs++;
    model._getMetrics(d, pub).subs++;
    var metrics = model._getMetrics(d, pub);
    test.equal(metrics.subs, 2);
  }
);

Tinytest.add(
  'Models - PubSub - Metrics - multi date',
  function (test) {
    var pub = "postsList";
    var d1 = new Date('2013 Dec 10 20:31:12').getTime();
    var d2 = new Date('2013 Dec 11 20:31:10').getTime();
    var model = new PubsubModel();
    model._getMetrics(d1, pub).subs++;
    model._getMetrics(d1, pub).subs++;
    model._getMetrics(d2, pub).subs++;
    var metrics = [
      model._getMetrics(d1, pub),
      model._getMetrics(d2, pub)
    ];
    test.equal(metrics[0].subs, 2);
    test.equal(metrics[1].subs, 1);
  }
);

Tinytest.add(
  'Models - PubSub - Metrics - same minute',
  function (test) {
    var pub = "postsList";
    var d1 = new Date('2013 Dec 10 20:31:12').getTime();
    var d2 = new Date('2013 Dec 10 20:31:40').getTime();
    var model = new PubsubModel();
    model._getMetrics(d1, pub).subs++;
    model._getMetrics(d1, pub).subs++;
    model._getMetrics(d2, pub).subs++;
    var metrics = [
      model._getMetrics(d1, pub),
      model._getMetrics(d2, pub)
    ];
    test.equal(metrics[0].subs, 3);
    test.equal(metrics[1].subs, 3);
    test.equal(metrics[0], metrics[1]);
  }
);

Tinytest.add(
  'Models - PubSub - BuildPayload - subs',
  function (test) {
    var pub = "postsList";
    var d1 = new Date('2013 Dec 10 20:31:12').getTime();
    var model = new PubsubModel();
    model._getMetrics(d1, pub).subs++;
    model._getMetrics(d1, pub).subs++;
    model._getMetrics(d1, pub).subs++;
    var metrics = [
      model.buildPayload(),
      model.metricsByMinute
    ];
    test.equal(metrics[0].pubMetrics[0].pubs.postsList.subs, 3);
    test.equal(metrics[1], {});
  }
);

Tinytest.add(
  'Models - PubSub - BuildPayload - routes',
  function (test) {
    var pub = "postsList";
    var d1 = new Date('2013 Dec 10 20:31:12').getTime();
    var route = 'route1';
    var model = new PubsubModel();
    model._getMetrics(d1, pub).subRoutes = {}
    model._getMetrics(d1, pub).subRoutes[route] = 0;
    model._getMetrics(d1, pub).subRoutes[route]++;
    model._getMetrics(d1, pub).subRoutes[route]++;
    model._getMetrics(d1, pub).subRoutes[route]++;
    var metrics = [
      model.buildPayload(),
      model.metricsByMinute
    ];
    test.equal(metrics[0].pubMetrics[0].pubs.postsList.subRoutes['route1'], 3);
    test.equal(metrics[1], {});
  }
);

Tinytest.add(
  'Models - PubSub - BuildPayload - response time',
  function (test) {
    var pub = "postsList";
    var d1 = new Date('2013 Dec 10 20:31:12').getTime();
    var model = new PubsubModel();
    var metrics =  model._getMetrics(d1, pub);
    metrics.resTime = 3000;
    metrics.subs = 3;
    var metrics = [
      model.buildPayload(),
      model.metricsByMinute
    ];
    test.equal(metrics[0].pubMetrics[0].pubs.postsList.resTime, 1000);
    test.equal(metrics[1], {});
  }
);

Tinytest.add(
  'Models - PubSub - BuildPayload - lifetime',
  function (test) {
    var pub = "postsList";
    var d1 = new Date('2013 Dec 10 20:31:12').getTime();
    var model = new PubsubModel();
    var metrics =  model._getMetrics(d1, pub);
    metrics.lifeTime = 4000;
    metrics.unsubs = 2;
    var metrics = [
      model.buildPayload(),
      model.metricsByMinute
    ];
    test.equal(metrics[0].pubMetrics[0].pubs.postsList.lifeTime, 2000);
    test.equal(metrics[1], {});
  }
);

Tinytest.add(
  'Models - PubSub - BuildPayload - multiple publications',
  function (test) {
    var d1 = new Date('2013 Dec 10 20:31:12').getTime();
    var model = new PubsubModel();
    model._getMetrics(d1, 'postsList').subs = 2;
    model._getMetrics(d1, 'singlePost').subs++;
    var metrics = [
      model.buildPayload(),
      model.metricsByMinute
    ];
    test.equal(metrics[0].pubMetrics[0].pubs.postsList.subs, 2);
    test.equal(metrics[0].pubMetrics[0].pubs.singlePost.subs, 1);
    test.equal(metrics[1], {});
  }
);

Tinytest.add(
  'Models - PubSub - BuildPayload - multiple dates',
  function (test) {
    var d1 = new Date('2013 Dec 10 20:31:12').getTime();
    var d2 = new Date('2013 Dec 11 20:31:12').getTime();
    var model = new PubsubModel();
    model._getMetrics(d1, 'postsList').subs = 2;
    model._getMetrics(d2, 'postsList').subs++;
    var metrics = [
      model.buildPayload(),
      model.metricsByMinute
    ];
    test.equal(metrics[0].pubMetrics[0].pubs.postsList.subs, 2);
    test.equal(metrics[0].pubMetrics[1].pubs.postsList.subs, 1);
    test.equal(metrics[1], {});
  }
);

Tinytest.add(
  'Models - PubSub - BuildPayload - multiple subscriptions and dates',
  function (test) {
    var d1 = new Date('2013 Dec 10 20:31:12').getTime();
    var d2 = new Date('2013 Dec 11 20:31:12').getTime();
    var model = new PubsubModel();
    model._getMetrics(d1, 'postsList').subs = 2;
    model._getMetrics(d2, 'singlePost').subs++;
    var metrics = [
      model.buildPayload(),
      model.metricsByMinute
    ];
    test.equal(metrics[0].pubMetrics[0].pubs.postsList.subs, 2);
    test.equal(metrics[0].pubMetrics[1].pubs.singlePost.subs, 1);
    test.equal(metrics[1], {});
  }
);

Tinytest.add(
  'Models - PubSub - Observer Cache - no cache',
  function (test) {
    var original = Kadira.syncedDate.getTime;
    var dates = [
      new Date('2013 Dec 10 20:31:12').getTime(),
      new Date('2013 Dec 10 20:31:22').getTime()
    ];
    Kadira.syncedDate.getTime = function () {
      return dates.pop();
    }
    var model = new PubsubModel();
    model.incrementHandleCount({name: 'postsList'}, false);
    model.incrementHandleCount({name: 'postsList'}, false);
    var metrics = [
      model.buildPayload(),
      model.metricsByMinute
    ];
    test.equal(metrics[0].pubMetrics[0].pubs.postsList.totalObservers, 2);
    test.equal(metrics[0].pubMetrics[0].pubs.postsList.cachedObservers, 0);
    Kadira.syncedDate.getTime = original;
  }
);

Tinytest.add(
  'Models - PubSub - Observer Cache - single cache',
  function (test) {
    var original = Kadira.syncedDate.getTime;
    var dates = [
      new Date('2013 Dec 10 20:31:12').getTime(),
      new Date('2013 Dec 10 20:31:22').getTime()
    ];
    Kadira.syncedDate.getTime = function () {
      return dates.pop();
    }
    var model = new PubsubModel();
    model.incrementHandleCount({name: 'postsList'}, false);
    model.incrementHandleCount({name: 'postsList'}, true);
    var metrics = [
      model.buildPayload(),
      model.metricsByMinute
    ];
    test.equal(metrics[0].pubMetrics[0].pubs.postsList.totalObservers, 2);
    test.equal(metrics[0].pubMetrics[0].pubs.postsList.cachedObservers, 1);
    Kadira.syncedDate.getTime = original;
  }
);

Tinytest.add(
  'Models - PubSub - Observer Cache - multiple dates',
  function (test) {
    var original = Kadira.syncedDate.getTime;
    var dates = [
      new Date('2013 Dec 10 20:31:12').getTime(),
      new Date('2013 Dec 12 20:31:22').getTime()
    ];
    Kadira.syncedDate.getTime = function () {
      return dates.pop();
    }
    var model = new PubsubModel();
    model.incrementHandleCount({name: 'postsList'}, false);
    model.incrementHandleCount({name: 'postsList'}, true);
    var metrics = [
      model.buildPayload(),
      model.metricsByMinute
    ];
    test.equal(metrics[0].pubMetrics[0].pubs.postsList.totalObservers, 1);
    test.equal(metrics[0].pubMetrics[0].pubs.postsList.cachedObservers, 0);
    test.equal(metrics[0].pubMetrics[1].pubs.postsList.totalObservers, 1);
    test.equal(metrics[0].pubMetrics[1].pubs.postsList.cachedObservers, 1);
    Kadira.syncedDate.getTime = original;
  }
);

Tinytest.add(
  'Models - PubSub - ActiveDocs - Single Sub - simple',
  function (test) {
    CleanTestData();
    var docs = [{data: 'data1'}, {data: 'data2'}, {data: 'data3'}];
    docs.forEach(function(doc) {TestData.insert(doc)});
    var client = GetMeteorClient();
    var h1 = SubscribeAndWait(client, 'tinytest-data');
    Wait(200);
    var payload = GetPubSubPayload();
    test.equal(payload[0].pubs['tinytest-data'].activeDocs, 3);
    h1.stop();
    CloseClient(client);
  }
);

Tinytest.add(
  'Models - PubSub - ActiveDocs - Single Sub - docs added',
  function (test) {
    CleanTestData();
    var docs = [{data: 'data1'}, {data: 'data2'}, {data: 'data3'}];
    docs.forEach(function(doc) {TestData.insert(doc)});
    var client = GetMeteorClient();
    var h1 = SubscribeAndWait(client, 'tinytest-data');
    TestData.insert({data: 'data4'});
    Wait(200);
    var payload = GetPubSubPayload();
    test.equal(payload[0].pubs['tinytest-data'].activeDocs, 4);
    h1.stop();
    CloseClient(client);
  }
);

Tinytest.add(
  'Models - PubSub - ActiveDocs - Single Sub - docs removed',
  function (test) {
    CleanTestData();
    var docs = [{data: 'data1'}, {data: 'data2'}, {data: 'data3'}];
    docs.forEach(function(doc) {TestData.insert(doc)});
    var client = GetMeteorClient();
    var h1 = SubscribeAndWait(client, 'tinytest-data');
    TestData.remove({data: 'data3'});
    Wait(200);
    var payload = GetPubSubPayload();
    test.equal(payload[0].pubs['tinytest-data'].activeDocs, 2);
    h1.stop();
    CloseClient(client);
  }
);

Tinytest.add(
  'Models - PubSub - ActiveDocs - Single Sub - unsub before payload',
  function (test) {
    CleanTestData();
    var docs = [{data: 'data1'}, {data: 'data2'}, {data: 'data3'}];
    docs.forEach(function(doc) {TestData.insert(doc)});
    var client = GetMeteorClient();
    var h1 = SubscribeAndWait(client, 'tinytest-data');
    h1.stop();
    Wait(200);
    var payload = GetPubSubPayload();
    test.equal(payload[0].pubs['tinytest-data'].activeDocs, 0);
    CloseClient(client);
  }
);

Tinytest.add(
  'Models - PubSub - ActiveDocs - Single Sub - close before payload',
  function (test) {
    CleanTestData();
    var docs = [{data: 'data1'}, {data: 'data2'}, {data: 'data3'}];
    docs.forEach(function(doc) {TestData.insert(doc)});
    var client = GetMeteorClient();
    var h1 = SubscribeAndWait(client, 'tinytest-data');
    CloseClient(client);
    Wait(200);
    var payload = GetPubSubPayload();
    test.equal(payload[0].pubs['tinytest-data'].activeDocs, 0);
    h1.stop();
  }
);

Tinytest.add(
  'Models - PubSub - ActiveDocs - Multiple Subs - simple',
  function (test) {
    CleanTestData();
    var docs = [{data: 'data1'}, {data: 'data2'}, {data: 'data3'}];
    docs.forEach(function(doc) {TestData.insert(doc)});
    var client = GetMeteorClient();
    var h1 = SubscribeAndWait(client, 'tinytest-data');
    var h2 = SubscribeAndWait(client, 'tinytest-data');
    var h3 = SubscribeAndWait(client, 'tinytest-data');
    Wait(200);
    var payload = GetPubSubPayload();
    test.equal(payload[0].pubs['tinytest-data'].activeDocs, 9);
    h1.stop();
    h2.stop();
    h3.stop();
    CloseClient(client);
  }
);

Tinytest.add(
  'Models - PubSub - ActiveDocs - Multiple Subs - sub and unsub',
  function (test) {
    CleanTestData();
    var docs = [{data: 'data1'}, {data: 'data2'}, {data: 'data3'}];
    docs.forEach(function(doc) {TestData.insert(doc)});
    var client = GetMeteorClient();
    var h1 = SubscribeAndWait(client, 'tinytest-data');
    var h2 = SubscribeAndWait(client, 'tinytest-data');
    var h3 = SubscribeAndWait(client, 'tinytest-data');
    h1.stop();
    Wait(200);
    var payload = GetPubSubPayload();
    test.equal(payload[0].pubs['tinytest-data'].activeDocs, 6);
    h2.stop();
    h3.stop();
    CloseClient(client);
  }
);

Tinytest.add(
  'Models - PubSub - avgDocSize - single',
  function (test) {
    CleanTestData();
    var docs = [{data: 'data1'}, {data: 'data2'}, {data: 'data3'}];
    var size = docs.reduce(function (total, doc) {
      var valuesArray = _.values(doc);
      return total + Buffer.byteLength(JSON.stringify(doc));
    }, 0);
    docs.forEach(function(doc) {TestData.insert(doc)});
    var client = GetMeteorClient();
    var h1 = SubscribeAndWait(client, 'tinytest-data');
    Wait(200);
    var payload = GetPubSubPayload();
    test.equal(payload[0].pubs['tinytest-data'].avgDocSize, size/3);
    h1.stop();
    CloseClient(client);
  }
);

Tinytest.add(
  'Models - PubSub - avgDocSize - multiple',
  function (test) {
    CleanTestData();
    var docs = [{data: 'data1'}, {data: 'data2'}, {data: 'data3'}];
    var size = docs.reduce(function (total, doc) {
      var valuesArray = _.values(doc);
      return total + Buffer.byteLength(JSON.stringify(doc));
    }, 0);
    docs.forEach(function(doc) {TestData.insert(doc)});
    var client1 = GetMeteorClient();
    var h1 = SubscribeAndWait(client1, 'tinytest-data');
    var client2 = GetMeteorClient();
    var h2 = SubscribeAndWait(client2, 'tinytest-data');
    var client3 = GetMeteorClient();
    var h3 = SubscribeAndWait(client3, 'tinytest-data');
    Wait(200);
    var payload = GetPubSubPayload();
    test.equal(payload[0].pubs['tinytest-data'].avgDocSize, 3*size/9);
    h1.stop();
    h2.stop();
    h3.stop();
    CloseClient(client1);
    CloseClient(client2);
    CloseClient(client3);
  }
);