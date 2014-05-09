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
