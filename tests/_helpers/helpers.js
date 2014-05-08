GetMeteorClient = function (_url) {
  var url = _url || Meteor.absoluteUrl();
  return DDP.connect(url, {retry: false});
}

RegisterMethod = function (F) {
  var id = 'test_' + Random.id();
  var methods = {};
  methods[id] = F;
  Meteor.methods(methods);
  return id;
}

RegisterPublication = function (F) {
  var id = 'test_' + Random.id();
  Meteor.publish(id, F);
  return id;
}

EnableTrackingMethods = function () {
  // var original = Apm.models.methods.processMethod;
  // Apm.models.methods.processMethod = function(method) {
  //   MethodStore.push(method);
  //   original.call(Apm.models.methods, method);
  // };
}

GetLastMethodEvents = function (_indices) {
  if (MethodStore.length < 1) return [];
  var indices = _indices || [0];
  var events = MethodStore[MethodStore.length - 1].events;
  events = Array.prototype.slice.call(events, 0);
  events = events.filter(isNotCompute);
  events = events.map(filterFields);
  return events;

  function isNotCompute (event) {
    return event[0] !== 'compute';
  }

  function filterFields (event) {
    var filteredEvent = [];
    indices.forEach(function (index) {
      if (event[index]) filteredEvent[index] = event[index];
    });
    return filteredEvent;
  }
}

GetPubSubMetrics = function () {
  var metricsArr = [];
  for(var dateId in Apm.models.pubsub.metricsByMinute) {
    metricsArr.push(Apm.models.pubsub.metricsByMinute[dateId]);
  }
  return metricsArr;
}

GetPubSubPayload = function (detailInfoNeeded) {
  return Apm.models.pubsub.buildPayload(detailInfoNeeded).pubMetrics;
}

Wait = function (time) {
  var Future = Npm.require('fibers/future');
  var f = new Future();
  Meteor.setTimeout(function () {
    f.return();
  }, time);
  f.wait();
  return;
}

GetDataSize = function (docs) {
  if(!(docs instanceof Array)) {
    docs = [docs];
  }
  var size = 0;
  docs.forEach(function(doc) {
    size+= Buffer.byteLength(JSON.stringify(doc));
  });
  return size;
}

CleanTestData = function () {
  MethodStore = [];
  TestData.remove({});
  Apm.models.pubsub.metricsByMinute = {};
  Apm.models.pubsub.subscriptions = {};
}
