getLastMethodEvents = function(server, fields) {
  var methodsStore = server.evalSync(function() {
    var methodsStore = Apm.models.methods.methodsStore;
    emit('return', methodsStore);
  });

  for(var key in methodsStore) {
    return getEvents(methodsStore[key], fields);
  }
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
    Meteor.apply(method, args, function(err, rtn) {
      if(err) {
        throw err;
      } else {
        emit('return', rtn);
      }
    });
  }, method, args);

  return result;
};