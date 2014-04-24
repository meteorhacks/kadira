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

GetLastMethodEvents = function(server, fields) {
  var method = server.evalSync(function() {
    emit('return', MethodsStore[MethodsStore.length - 1]);
  });

  return getEvents(method, fields);
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

function getEvents(method, fields) {
  var events = [];
  var fields = fields || ['type'];

  method.events.forEach(function(e) {
    var data = {};
    fields.forEach(function(field) {
      data[field] = e[field];
    });
    events.push(data);
  });

  return events;
};

callMethod = function(client, method, args) {
  args = args || [];
  var result = client.evalSync(function(method, args) {
    console.log(Meteor)
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