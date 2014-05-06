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

EnableTrackingMethods = function () {
  var original = Apm.models.methods.processMethod;
  Apm.models.methods.processMethod = function(method) {
    MethodStore.push(method);
    original.call(Apm.models.methods, method);
  };
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

CleanTestData = function () {
  var list = Array.prototype.slice.call(arguments, 0);
  var cleaners = {
    methodstore: function () {
      MethodStore = [];
    },

    testdata: function () {
      TestData.remove({});
    }
  };
  list.forEach(function (key) {
    var item = arguments[key];
    cleaners[item] && cleaners[item]();
  });
}
