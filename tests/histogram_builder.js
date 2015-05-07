Tinytest.add(
  "Histogram Builder - add and collect for same time same name",
  function(test) {
    var hb = new HistogramBuilder();
    hb.add(10, "n1", 100);
    hb.add(10, "n1", 200);
    hb._buildHistograms();

    var expectedPayload = [
      {
        "time":10,
        "name":"n1",
        "histogram": {
          "bins":[[100,1],[200,1]],
          "binSize":80
        }
      }
    ];

    test.equal(expectedPayload, hb._readyToSend);
    test.equal({}, hb._byMinutes);
    hb.stop();
  }
);

Tinytest.add(
  "Histogram Builder - add and collect for same time different names",
  function(test) {
    var hb = new HistogramBuilder();
    hb.add(10, "n1", 100);
    hb.add(10, "n1", 200);
    hb.add(10, "n2", 200);
    hb.add(10, "n2", 200);
    hb._buildHistograms();

    test.equal(hb._readyToSend[0].name, "n1");
    test.equal(hb._readyToSend[1].name, "n2");
    test.equal({}, hb._byMinutes);
    hb.stop();
  }
);

Tinytest.add(
  "Histogram Builder - add and collect for different times same name",
  function(test) {
    var hb = new HistogramBuilder();
    hb.add(10, "n1", 100);
    hb.add(10, "n1", 200);
    hb.add(20, "n1", 200);
    hb.add(20, "n1", 200);
    hb._buildHistograms();

    test.equal(hb._readyToSend[0].time, 10);
    test.equal(hb._readyToSend[1].time, 20);
    test.equal({}, hb._byMinutes);
    hb.stop();
  }
);

Tinytest.add(
  "Histogram Builder - add and older time resTimes",
  function(test) {
    var hb = new HistogramBuilder();
    hb.add(10, "n1", 100);
    hb.add(10, "n1", 200);
    hb.add(2, "n1", 200);
    hb.add(2, "n1", 200);
    hb._buildHistograms();

    test.equal(hb._readyToSend[0].time, 10);
    test.equal(hb._readyToSend.length, 1);
    test.equal({}, hb._byMinutes);
    hb.stop();
  }
);

Tinytest.add(
  "Histogram Builder - collect histograms",
  function(test) {
    var hb = new HistogramBuilder();
    hb.add(10, "n1", 100);
    hb.add(10, "n1", 200);
    hb._buildHistograms();

    var expectedPayload = [
      {
        "time":10,
        "name":"n1",
        "histogram": {
          "bins":[[100,1],[200,1]],
          "binSize":80
        }
      }
    ];

    test.equal(hb._readyToSend.length, 1);
    test.equal(hb.collectHistograms(), expectedPayload);
    test.equal(hb._readyToSend.length, 0);
    hb.stop();
  }
);

Tinytest.add(
  "Histogram Builder - auto building",
  function(test) {
    var hb = new HistogramBuilder();
    hb.add(10, "n1", 100);
    hb.add(10, "n1", 200);
    
    test.equal(hb._readyToSend.length, 0);
    
    hb.add(20, "n1", 200);

    test.equal(hb._readyToSend.length, 1);
    hb.stop();
  }
);

Tinytest.addAsync(
  "Histogram Builder - expire old histograms",
  function(test, done) {
    var hb = new HistogramBuilder("histo-name", {
      maxAge: 200,
      expireCheckInterval: 300
    });
    hb.add(10, "n1", 100);
    hb.add(10, "n1", 200);
    
    Meteor.setTimeout(function() {
      test.equal(hb._readyToSend.length, 0);
      Meteor.setTimeout(function() {
        test.equal(hb._readyToSend.length, 1);
        done();
      }, 300);
    }, 50);
  }
);