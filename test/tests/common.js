EnableTrackingMethods = function(server) {
  server.evalSync(function() {
    if(typeof MethodsStore == 'undefined') {
      MethodsStore = [];
    }

    var original = Apm.models.methods.processMethod;
    Apm.models.methods.processMethod = function(method) {
      MethodsStore.push(method);
      original.call(Apm.models.methods, method);
    };

    emit('return');
  });
};

GetLastMethodEvents = function(server, indices) {
  var method = server.evalSync(function() {
    emit('return', MethodsStore[MethodsStore.length - 1]);
  });

  return getEvents(method, indices);
};

GetPubsubMetrics = function(server) {
  var metrics = server.evalSync(function() {
    emit('return', Apm.models.pubsub.metricsByMinute);
  });

  var metricsArr = [];
  for(var dateId in metrics) {
    metricsArr.push(metrics[dateId]);
  }

  return metricsArr;
};

GetPubsubPayload = function(server, detailInfoNeeded) {
  var payload = server.evalSync(function(detailInfoNeeded) {
    emit('return', Apm.models.pubsub.buildPayload(detailInfoNeeded));
  }, detailInfoNeeded);

  return payload.pubMetrics;
};

Wait = function(server, time) {
  server.evalSync(function(time) {
    setTimeout(function() {
      emit('return');
    }, time);
  }, time);
};

CleanComputes = function (events) {
  var clean = [];
  events.forEach(function (e) {
    if (e[0] != 'compute') clean.push(e);
  });
  return clean;
}

function getEvents(method, indices) {
  var events = [];
  var indices = indices || [0];

  method.events.forEach(function(e) {
    var data = [];
    indices.forEach(function(index) {
      if (e[index]) data[index] = e[index];
    });
    events.push(data);
  });

  return events;
};

callMethod = function(client, method, args) {
  args = args || [];
  var result = client.evalSync(function(method, args) {
    Meteor.apply(method, args, function(err, rtn) {
      if(err) {
        emit('return', err);
      } else {
        emit('return', rtn);
      }
    });
  }, method, args);

  return result;
};