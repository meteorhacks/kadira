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
        ts.addTrace({name:"one", type: 'method', metrics: {total: 100}});
        emit('return', ts.currentMaxTrace);
      });

      assert.deepEqual(currentMaxTrace, {"method::one": {name:"one", type: 'method', metrics: {total: 100}}});
      done();
    });

    test('second time higher total', function(done, server) {
      var currentMaxTrace = server.evalSync(function() {
        var ts = new TracerStore();
        ts.addTrace({name:"one", type: 'method', metrics: {total: 100}});
        ts.addTrace({name:"one", type: 'method', metrics: {total: 200}});
        emit('return', ts.currentMaxTrace);
      });

      assert.deepEqual(currentMaxTrace, {"method::one": {name:"one", type: 'method', metrics: {total: 200}}});
      done();
    });

    test('second time lower total', function(done, server) {
      var currentMaxTrace = server.evalSync(function() {
        var ts = new TracerStore();
        ts.addTrace({name:"one", type: 'method', metrics: {total: 100}});
        ts.addTrace({name:"one", type: 'method', metrics: {total: 20}});
        emit('return', ts.currentMaxTrace);
      });

      assert.deepEqual(currentMaxTrace, {"method::one": {name:"one", type: 'method', metrics: {total: 100}}});
      done();
    });
  });

  suite('processTraces', function() {
    test('process at first', function(done, server) {
      var ts = server.evalSync(function() {
        var ts = new TracerStore({archiveEvery: 3});
        ts.addTrace({name:"one", type: 'method', metrics: {total: 100}});
        ts.processTraces();

        emit('return', ts);
      });

      assert.deepEqual(ts.currentMaxTrace, {"method::one": null});
      assert.deepEqual(ts.maxTotals, {"method::one": [100]});
      assert.deepEqual(ts.traceArchive, [{name:"one", type: 'method', metrics: {total: 100}}]);
      done();
    });

    test('no traces', function(done, server) {
      var ts = server.evalSync(function() {
        var ts = new TracerStore({maxTotalPoints: 3});

        ts.addTrace({name:"one", type: 'method', metrics: {total: 100}});
        ts.processTraces();
        ts.processTraces();

        emit('return', ts);
      });

      assert.deepEqual(ts.maxTotals, {"method::one": [100, 0]});
      assert.deepEqual(ts.traceArchive, [{name:"one", type: 'method', metrics: {total: 100}}]);
      done();
    });

    test('maxTotalPoints', function(done, server) {
      var ts = server.evalSync(function() {
        var ts = new TracerStore({maxTotalPoints: 3});

        ts.addTrace({name:"one", type: 'method', metrics: {total: 100}});
        ts.processTraces();
        ts.addTrace({name:"one", type: 'method', metrics: {total: 200}});
        ts.processTraces();
        ts.addTrace({name:"one", type: 'method', metrics: {total: 400}});
        ts.processTraces();
        ts.addTrace({name:"one", type: 'method', metrics: {total: 300}});
        ts.processTraces();
        ts.addTrace({name:"one", type: 'method', metrics: {total: 200}});
        ts.processTraces();

        emit('return', ts);
      });

      assert.deepEqual(ts.maxTotals, {"method::one": [400, 300, 200]});
      done();
    });

    test('process three times: with no new traces', function(done, server) {
      var ts = server.evalSync(function() {
        var ts = new TracerStore({archiveEvery: 20});
        ts.addTrace({name:"one", type: 'method', metrics: {total: 100}});
        ts.processTraces();
        ts.processTraces();
        ts.processTraces();

        emit('return', ts);
      });

      assert.deepEqual(ts.currentMaxTrace, {"method::one": null});
      assert.deepEqual(ts.maxTotals, {"method::one": [100, 0, 0]});
      assert.deepEqual(ts.traceArchive, [{name:"one", type: 'method', metrics: {total: 100}}]);
      done();
    });

    test('process three times: with new traces(no outliers)', function(done, server) {
      var ts = server.evalSync(function() {
        var ts = new TracerStore({archiveEvery: 20});
        ts.addTrace({name:"one", type: 'method', metrics: {total: 100}});
        ts.processTraces();
        ts.addTrace({name:"one", type: 'method', metrics: {total: 150}});
        ts.processTraces();
        ts.addTrace({name:"one", type: 'method', metrics: {total: 200}});
        ts.processTraces();

        emit('return', ts);
      });

      assert.deepEqual(ts.currentMaxTrace, {"method::one": null});
      assert.deepEqual(ts.maxTotals, {"method::one": [100, 150, 200]});
      assert.deepEqual(ts.traceArchive, [{name:"one", type: 'method', metrics: {total: 100}}]);
      done();
    });

    test('process time times: with no new traces: with defaultArchive', function(done, server) {
      var ts = server.evalSync(function() {
        var ts = new TracerStore({archiveEvery: 3});
        ts.addTrace({name:"one", type: 'method', metrics: {total: 100}});
        ts.processTraces();
        ts.addTrace({name:"one", type: 'method', metrics: {total: 150}});
        ts.processTraces();
        ts.addTrace({name:"one", type: 'method', metrics: {total: 200}});
        ts.processTraces();
        ts.addTrace({name:"one", type: 'method', metrics: {total: 180}});
        ts.processTraces();

        emit('return', ts);
      });

      assert.deepEqual(ts.currentMaxTrace, {"method::one": null});
      assert.deepEqual(ts.maxTotals, {"method::one": [100, 150, 200, 180]});
      assert.deepEqual(ts.traceArchive, [
        {name:"one", type: 'method', metrics: {total: 100}},
        {name:"one", type: 'method', metrics: {total: 180}}
      ]);
      done();
    });

    test('process three times: with one outlier', function(done, server) {
      var ts = server.evalSync(function() {
        var ts = new TracerStore({archiveEvery: 20});
        ts.addTrace({name:"one", type: 'method', metrics: {total: 100}});
        ts.processTraces();
        ts.addTrace({name:"one", type: 'method', metrics: {total: 200}});
        ts.processTraces();
        ts.addTrace({name:"one", type: 'method', metrics: {total: 1500}});
        ts.processTraces();

        emit('return', ts);
      });

      assert.deepEqual(ts.currentMaxTrace, {"method::one": null});
      assert.deepEqual(ts.maxTotals, {"method::one": [100, 200, 1500]});
      assert.deepEqual(ts.traceArchive, [
        {name:"one", type: 'method', metrics: {total: 100}},
        {name:"one", type: 'method', metrics: {total: 1500}}
      ]);
      done();
    });

    test('process 5 times: two outlier', function(done, server) {
      var ts = server.evalSync(function() {
        var ts = new TracerStore({archiveEvery: 20});
        ts.addTrace({name:"one", type: 'method', metrics: {total: 100}});
        ts.processTraces();
        ts.addTrace({name:"one", type: 'method', metrics: {total: 150}});
        ts.processTraces();
        ts.addTrace({name:"one", type: 'method', metrics: {total: 200}});
        ts.processTraces();
        ts.addTrace({name:"one", type: 'method', metrics: {total: 1500}});
        ts.processTraces();
        ts.addTrace({name:"one", type: 'method', metrics: {total: 1800}});
        ts.processTraces();

        emit('return', ts);
      });

      assert.deepEqual(ts.currentMaxTrace, {"method::one": null});
      assert.deepEqual(ts.maxTotals, {"method::one": [100, 150, 200, 1500, 1800]});
      assert.deepEqual(ts.traceArchive, [
        {name:"one", type: 'method', metrics: {total: 100}},
        {name:"one", type: 'method', metrics: {total: 1500}},
        {name:"one", type: 'method', metrics: {total: 1800}}
      ]);
      done();
    });

  });

  suite('_handleErrors', function() {
    test('single error', function(done, server) {
      var trace = {name: 'one', type: 'method', events: [
        {type: 'start'},
        {type: 'end', data: {error: {message: "ERROR_MESSAGE"}}}
      ]};

      var ts = server.evalSync(function(trace) {
        var ts = new TracerStore();

        ts._handleErrors(trace);
        emit('return', ts);
      }, trace);

      assert.deepEqual(ts.traceArchive, [trace]);
      done();
    });

    test('single error: without data', function(done, server) {
      var trace = {name: 'one', type: 'method', events: [
        {type: 'start'},
        {type: 'end'}
      ]};

      var ts = server.evalSync(function(trace) {
        var ts = new TracerStore();

        ts._handleErrors(trace);
        emit('return', ts);
      }, trace);

      assert.deepEqual(ts.traceArchive, []);
      done();
    });

    test('multiple errors', function(done, server) {
      var trace = {name: 'one', type: 'method', events: [
        {type: 'start'},
        {type: 'end', data: {error: {message: "ERROR_MESSAGE"}}}
      ]};

      var ts = server.evalSync(function(trace) {
        var ts = new TracerStore();

        ts._handleErrors(trace);
        ts._handleErrors(trace);
        ts._handleErrors(trace);
        emit('return', ts);
      }, trace);

      assert.deepEqual(ts.traceArchive, [trace]);
      done();
    });

    test('multiple different errors', function(done, server) {
      var trace = {name: 'one', type: 'method', events: [
        {type: 'start'},
        {type: 'end', data: {error: {message: "ERROR_MESSAGE"}}}
      ]};

      var trace2 = {name: 'two', type: 'method', events: [
        {type: 'start'},
        {type: 'end', data: {error: {message: "ERROR_MESSAGE"}}}
      ]};

      var ts = server.evalSync(function(trace, trace2) {
        var ts = new TracerStore();

        ts._handleErrors(trace);
        ts._handleErrors(trace);
        ts._handleErrors(trace2);
        emit('return', ts);
      }, trace, trace2);

      assert.deepEqual(ts.traceArchive, [trace, trace2]);
      done();
    });

    test('multiple errors after rest', function(done, server) {
      var trace = {name: 'one', type: 'method', events: [
        {type: 'start'},
        {type: 'end', data: {error: {message: "ERROR_MESSAGE"}}}
      ]};

      var ts = server.evalSync(function(trace) {
        var ts = new TracerStore();

        ts._handleErrors(trace);
        ts._handleErrors(trace);
        ts._handleErrors(trace);
        ts.processTraces();
        ts._handleErrors(trace);
        ts._handleErrors(trace);
        emit('return', ts);
      }, trace);

      assert.deepEqual(ts.traceArchive, [trace, trace]);
      done();
    });
  });
});
