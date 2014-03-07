var assert = require('assert');

suite('Pubsub Model', function() {
  suite('._getMetrics', function() {
    test('same date', function(done, server) {
      var metrics = server.evalSync(function() {
        var pub = "postsList";
        var d = new Date('2013 Dec 10 20:30').getTime();

        var model = new PubsubModel();
        model._getMetrics(d, pub).subs++;
        model._getMetrics(d, pub).subs++;

        emit('return', model._getMetrics(d, pub));
      });

      assert.equal(metrics.subs, 2);
      done();
    });

    test('multi date', function(done, server) {
      var metrics = server.evalSync(function() {
        var pub = "postsList";
        var d1 = new Date('2013 Dec 10 20:31:12').getTime();
        var d2 = new Date('2013 Dec 11 20:31:10').getTime();

        var model = new PubsubModel();
        model._getMetrics(d1, pub).subs++;
        model._getMetrics(d1, pub).subs++;
        model._getMetrics(d2, pub).subs++;

        emit('return', [
          model._getMetrics(d1, pub),
          model._getMetrics(d2, pub)
        ]);
      });

      assert.equal(metrics[0].subs, 2);
      assert.equal(metrics[1].subs, 1);
      done();
    });

    test('multi date: same minute', function(done, server) {
      var metrics = server.evalSync(function() {
        var pub = "postsList";
        var d1 = new Date('2013 Dec 10 20:31:12').getTime();
        var d2 = new Date('2013 Dec 10 20:31:40').getTime();

        var model = new PubsubModel();
        model._getMetrics(d1, pub).subs++;
        model._getMetrics(d1, pub).subs++;
        model._getMetrics(d2, pub).subs++;

        emit('return', [
          model._getMetrics(d1, pub),
          model._getMetrics(d2, pub)
        ]);
      });

      assert.equal(metrics[0].subs, 3);
      assert.equal(metrics[1].subs, 3);
      assert.deepEqual(metrics[0], metrics[1]);
      done();
    });
  });

  suite('.buildPayload', function() {
    test('subs', function(done, server) {
      var data = server.evalSync(function() {
        var pub = "postsList";
        var d1 = new Date('2013 Dec 10 20:31:12').getTime();

        var model = new PubsubModel();
        model._getMetrics(d1, pub).subs++;
        model._getMetrics(d1, pub).subs++;
        model._getMetrics(d1, pub).subs++;

        emit('return', [
          model.buildPayload(),
          model.metricsByMinute
        ]);
      });

      assert.deepEqual(data[0].pubMetrics[0].pubs.postsList.subs, 3);
      assert.deepEqual(data[1], {});
      done();
    });

    test('routes', function(done, server) {
      var data = server.evalSync(function() {
        var pub = "postsList";
        var d1 = new Date('2013 Dec 10 20:31:12').getTime();
        var route = 'route1';
        var model = new PubsubModel();
        model._getMetrics(d1, pub).subRoutes = {}
        model._getMetrics(d1, pub).subRoutes[route] = 0;
        model._getMetrics(d1, pub).subRoutes[route]++;
        model._getMetrics(d1, pub).subRoutes[route]++;
        model._getMetrics(d1, pub).subRoutes[route]++;

        emit('return', [
          model.buildPayload(),
          model.metricsByMinute
        ]);
      });
      assert.deepEqual(data[0].pubMetrics[0].pubs.postsList.subRoutes['route1'], 3);
      assert.deepEqual(data[1], {});
      done();
    });

    test('resTime', function(done, server) {
      var data = server.evalSync(function() {
        var pub = "postsList";
        var d1 = new Date('2013 Dec 10 20:31:12').getTime();

        var model = new PubsubModel();
        var metrics =  model._getMetrics(d1, pub);
        metrics.resTime = 3000;
        metrics.subs = 3;

        emit('return', [
          model.buildPayload(),
          model.metricsByMinute
        ]);
      });

      assert.deepEqual(data[0].pubMetrics[0].pubs.postsList.resTime, 1000);
      assert.deepEqual(data[1], {});
      done();
    });

    test('lifeTime', function(done, server) {
      var data = server.evalSync(function() {
        var pub = "postsList";
        var d1 = new Date('2013 Dec 10 20:31:12').getTime();

        var model = new PubsubModel();
        var metrics =  model._getMetrics(d1, pub);
        metrics.lifeTime = 4000;
        metrics.unsubs = 2;

        emit('return', [
          model.buildPayload(),
          model.metricsByMinute
        ]);
      });

      assert.deepEqual(data[0].pubMetrics[0].pubs.postsList.lifeTime, 2000);
      assert.deepEqual(data[1], {});
      done();
    });

    test('multiple publications', function(done, server) {
      var data = server.evalSync(function() {
        var d1 = new Date('2013 Dec 10 20:31:12').getTime();

        var model = new PubsubModel();
        model._getMetrics(d1, 'postsList').subs = 2;
        model._getMetrics(d1, 'singlePost').subs++;

        emit('return', [
          model.buildPayload(),
          model.metricsByMinute
        ]);
      });

      assert.deepEqual(data[0].pubMetrics[0].pubs.postsList.subs, 2);
      assert.deepEqual(data[0].pubMetrics[0].pubs.singlePost.subs, 1);
      assert.deepEqual(data[1], {});
      done();
    });

    test('multiple dates', function(done, server) {
      var data = server.evalSync(function() {
        var d1 = new Date('2013 Dec 10 20:31:12').getTime();
        var d2 = new Date('2013 Dec 11 20:31:12').getTime();

        var model = new PubsubModel();
        model._getMetrics(d1, 'postsList').subs = 2;
        model._getMetrics(d2, 'postsList').subs++;

        emit('return', [
          model.buildPayload(),
          model.metricsByMinute
        ]);
      });

      assert.deepEqual(data[0].pubMetrics[0].pubs.postsList.subs, 2);
      assert.deepEqual(data[0].pubMetrics[1].pubs.postsList.subs, 1);
      assert.deepEqual(data[1], {});
      done();
    });

    test('multiple dates and multiple publications', function(done, server) {
      var data = server.evalSync(function() {
        var d1 = new Date('2013 Dec 10 20:31:12').getTime();
        var d2 = new Date('2013 Dec 11 20:31:12').getTime();

        var model = new PubsubModel();
        model._getMetrics(d1, 'postsList').subs = 2;
        model._getMetrics(d2, 'singlePost').subs++;

        emit('return', [
          model.buildPayload(),
          model.metricsByMinute
        ]);
      });

      assert.deepEqual(data[0].pubMetrics[0].pubs.postsList.subs, 2);
      assert.deepEqual(data[0].pubMetrics[1].pubs.singlePost.subs, 1);
      assert.deepEqual(data[1], {});
      done();
    });
  });
});