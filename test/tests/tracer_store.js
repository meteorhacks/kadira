var assert = require('assert');

suite('TracerStore', function() {
  test('._getMean', function(done, server) {
    var mean = server.evalSync(function() {
      var ts = new TracerStore();
      var mean = ts._getMean([10, 20, 30]);
      emit('return', mean);
    });

    assert.equal(mean, 20);
    done();
  });

  test('._getMedian', function(done, server) {
    var median = server.evalSync(function() {
      var ts = new TracerStore();
      var median = ts._getMedian([10, 20, 30, 40, 1, 3]);
      emit('return', median);
    });

    assert.equal(median, 15);
    done();
  });

  test('._calculateMad', function(done, server) {
    var mad = server.evalSync(function() {
      var ts = new TracerStore();
      var dataSet = [10, 20, 30, 40, 1, 3, 3];
      var median = ts._getMedian(dataSet);
      var mad = ts._calculateMad(dataSet, median);
      emit('return', mad);
    });

    assert.equal(mad, 9);
    done();
  });

  suite('._isOutlier', function() {
    test('higher outlier', function(done, server) {
      var isOutlier = server.evalSync(function() {
        var ts = new TracerStore();
        var dataSet = [10, 20, 30, 40, 1, 3, 3];

        emit('return', ts._isOutlier(dataSet, 40, 3));
      });

      assert.equal(isOutlier, true);
      done();
    });

    test('lower outlier', function(done, server) {
      var isOutlier = server.evalSync(function() {
        var ts = new TracerStore();
        var dataSet = [10, 20, 30, 40, 20, 30, 30, 1];

        emit('return', ts._isOutlier(dataSet, 1, 3));
      });

      assert.equal(isOutlier, true);
      done();
    });
  });

  suite('addTrace', function() {
    test('fresh add', function(done, server) {
      var currentMaxTrace = server.evalSync(function() {
        var ts = new TracerStore();
        ts.addTrace('m1', {metrics: {total: 100}});
        emit('return', ts.currentMaxTrace);
      });

      assert.deepEqual(currentMaxTrace, {m1: {metrics: {total: 100}}});
      done();
    });

    test('second time higher total', function(done, server) {
      var currentMaxTrace = server.evalSync(function() {
        var ts = new TracerStore();
        ts.addTrace('m1', {metrics: {total: 100}});
        ts.addTrace('m1', {metrics: {total: 200}});
        emit('return', ts.currentMaxTrace);
      });

      assert.deepEqual(currentMaxTrace, {m1: {metrics: {total: 200}}});
      done();
    });

    test('second time lower total', function(done, server) {
      var currentMaxTrace = server.evalSync(function() {
        var ts = new TracerStore();
        ts.addTrace('m1', {metrics: {total: 100}});
        ts.addTrace('m1', {metrics: {total: 20}});
        emit('return', ts.currentMaxTrace);
      });

      assert.deepEqual(currentMaxTrace, {m1: {metrics: {total: 100}}});
      done();
    });
  });

  suite('_processTraces', function() {
    test('process at first', function(done, server) {
      var ts = server.evalSync(function() {
        var ts = new TracerStore({archiveEvery: 3});
        ts.addTrace('m1', {metrics: {total: 100}});
        ts._processTraces();

        emit('return', ts);
      });

      assert.deepEqual(ts.currentMaxTrace, {m1: null});
      assert.deepEqual(ts.maxTotals, {m1: [100]});
      assert.deepEqual(ts.traceArchive, [{metrics: {total: 100}}]);
      done();
    });

    test('maxTotalPoints', function(done, server) {
      var ts = server.evalSync(function() {
        var ts = new TracerStore({maxTotalPoints: 3});

        ts.addTrace('m1', {metrics: {total: 100}});
        ts._processTraces();
        ts.addTrace('m1', {metrics: {total: 200}});
        ts._processTraces();
        ts.addTrace('m1', {metrics: {total: 400}});
        ts._processTraces();
        ts.addTrace('m1', {metrics: {total: 300}});
        ts._processTraces();
        ts.addTrace('m1', {metrics: {total: 200}});
        ts._processTraces();

        emit('return', ts);
      });

      assert.deepEqual(ts.maxTotals, {m1: [400, 300, 200]});
      done();
    });

    test('process three times: with no new traces', function(done, server) {
      var ts = server.evalSync(function() {
        var ts = new TracerStore({archiveEvery: 20});
        ts.addTrace('m1', {metrics: {total: 100}});
        ts._processTraces();
        ts._processTraces();
        ts._processTraces();

        emit('return', ts);
      });

      assert.deepEqual(ts.currentMaxTrace, {m1: null});
      assert.deepEqual(ts.maxTotals, {m1: [100, 0, 0]});
      assert.deepEqual(ts.traceArchive, [{metrics: {total: 100}}]);
      done();
    });

    test('process three times: with new traces(no outliers)', function(done, server) {
      var ts = server.evalSync(function() {
        var ts = new TracerStore({archiveEvery: 20});
        ts.addTrace('m1', {metrics: {total: 100}});
        ts._processTraces();
        ts.addTrace('m1', {metrics: {total: 150}});
        ts._processTraces();
        ts.addTrace('m1', {metrics: {total: 200}});
        ts._processTraces();

        emit('return', ts);
      });

      assert.deepEqual(ts.currentMaxTrace, {m1: null});
      assert.deepEqual(ts.maxTotals, {m1: [100, 150, 200]});
      assert.deepEqual(ts.traceArchive, [{metrics: {total: 100}}]);
      done();
    });

    test('process time times: with no new traces: with defaultArchive', function(done, server) {
      var ts = server.evalSync(function() {
        var ts = new TracerStore({archiveEvery: 3});
        ts.addTrace('m1', {metrics: {total: 100}});
        ts._processTraces();
        ts.addTrace('m1', {metrics: {total: 150}});
        ts._processTraces();
        ts.addTrace('m1', {metrics: {total: 200}});
        ts._processTraces();
        ts.addTrace('m1', {metrics: {total: 180}});
        ts._processTraces();

        emit('return', ts);
      });

      assert.deepEqual(ts.currentMaxTrace, {m1: null});
      assert.deepEqual(ts.maxTotals, {m1: [100, 150, 200, 180]});
      assert.deepEqual(ts.traceArchive, [
        {metrics: {total: 100}},
        {metrics: {total: 180}}
      ]);
      done();
    });

    test('process three times: with one outlier', function(done, server) {
      var ts = server.evalSync(function() {
        var ts = new TracerStore({archiveEvery: 20});
        ts.addTrace('m1', {metrics: {total: 100}});
        ts._processTraces();
        ts.addTrace('m1', {metrics: {total: 200}});
        ts._processTraces();
        ts.addTrace('m1', {metrics: {total: 1500}});
        ts._processTraces();

        emit('return', ts);
      });

      assert.deepEqual(ts.currentMaxTrace, {m1: null});
      assert.deepEqual(ts.maxTotals, {m1: [100, 200, 1500]});
      assert.deepEqual(ts.traceArchive, [
        {metrics: {total: 100}},
        {metrics: {total: 1500}}
      ]);
      done();
    });

    test('process 5 times: two outlier', function(done, server) {
      var ts = server.evalSync(function() {
        var ts = new TracerStore({archiveEvery: 20});
        ts.addTrace('m1', {metrics: {total: 100}});
        ts._processTraces();
        ts.addTrace('m1', {metrics: {total: 150}});
        ts._processTraces();
        ts.addTrace('m1', {metrics: {total: 200}});
        ts._processTraces();
        ts.addTrace('m1', {metrics: {total: 1500}});
        ts._processTraces();
        ts.addTrace('m1', {metrics: {total: 1800}});
        ts._processTraces();

        emit('return', ts);
      });

      assert.deepEqual(ts.currentMaxTrace, {m1: null});
      assert.deepEqual(ts.maxTotals, {m1: [100, 150, 200, 1500, 1800]});
      assert.deepEqual(ts.traceArchive, [
        {metrics: {total: 100}},
        {metrics: {total: 1500}},
        {metrics: {total: 1800}}
      ]);
      done();
    });

  });
});
