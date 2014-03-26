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

  suite('._getOutlierLimits', function() {
    test('4 items', function(done, server) {
      var uLimit = server.evalSync(function() {
        var ts = new TracerStore();
        var uLimit = ts._getOutlierLimits([10, 20, 30, 10]);
        emit('return', uLimit);
      });

      assert.deepEqual(uLimit, {upper: 47.5, lower: -12.5});
      done();
    });

    test('3 items', function(done, server) {
      var uLimit = server.evalSync(function() {
        var ts = new TracerStore();
        var uLimit = ts._getOutlierLimits([10, 20, 70]);
        emit('return', uLimit);
      });

      assert.deepEqual(uLimit, {upper: 152.5, lower: -72.5});
      done();
    });

    test('7-items', function(done, server) {
      var uLimit = server.evalSync(function() {
        var ts = new TracerStore();
        var uLimit = ts._getOutlierLimits([10, 20, 30, 40, 200, 300, 200]);
        emit('return', uLimit);
      });

      assert.deepEqual(uLimit, {upper:512.5,lower:-292.5});
      done();
    })
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

    test('process three times: with no new traces', function(done, server) {
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
        ts.addTrace('m1', {metrics: {total: 1500}});
        ts._processTraces();
        ts.addTrace('m1', {metrics: {total: 200}});
        ts._processTraces();

        emit('return', ts);
      });

      assert.deepEqual(ts.currentMaxTrace, {m1: null});
      assert.deepEqual(ts.maxTotals, {m1: [100, 1500, 200]});
      assert.deepEqual(ts.traceArchive, [
        {metrics: {total: 100}},
        {metrics: {total: 1500}}
      ]);
      done();
    });

    test('process three times: with one outlier', function(done, server) {
      var ts = server.evalSync(function() {
        var ts = new TracerStore({archiveEvery: 20});
        ts.addTrace('m1', {metrics: {total: 100}});
        ts._processTraces();
        ts.addTrace('m1', {metrics: {total: 1500}});
        ts._processTraces();
        ts.addTrace('m1', {metrics: {total: 200}});
        ts._processTraces();

        emit('return', ts);
      });

      assert.deepEqual(ts.currentMaxTrace, {m1: null});
      assert.deepEqual(ts.maxTotals, {m1: [100, 1500, 200]});
      assert.deepEqual(ts.traceArchive, [
        {metrics: {total: 100}},
        {metrics: {total: 1500}}
      ]);
      done();
    });

    test('process three times: with two outlier', function(done, server) {
      var ts = server.evalSync(function() {
        var ts = new TracerStore({archiveEvery: 20});
        ts.addTrace('m1', {metrics: {total: 100}});
        ts._processTraces();
        ts.addTrace('m1', {metrics: {total: 1500}});
        ts._processTraces();
        ts.addTrace('m1', {metrics: {total: 200}});
        ts._processTraces();
        ts.addTrace('m1', {metrics: {total: 1800}});
        ts._processTraces();
        ts.addTrace('m1', {metrics: {total: 1500}});
        ts._processTraces();

        emit('return', ts);
      });

      assert.deepEqual(ts.currentMaxTrace, {m1: null});
      assert.deepEqual(ts.maxTotals, {m1: [100, 1500, 200, 1800, 1500]});
      assert.deepEqual(ts.traceArchive, [
        {metrics: {total: 100}},
        {metrics: {total: 1500}},
        {metrics: {total: 1800}}
      ]);
      done();
    });
  });
});
