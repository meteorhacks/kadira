Kadira.send = function (payload, path, callback) {
  if(!Kadira.connected) return;

  path = (path.substr(0, 1) != '/')? "/" + path : path;
  var endpoint = Kadira.options.endpoint + path;
  var retryCount = 0;
  var retry = new Retry({
    minCount: 1,
    minTimeout: 0,
    baseTimeout: 1000*5,
    maxTimeout: 1000*60,
  });

  var sendFunction = Kadira._getSendFunction();
  tryToSend();

  function tryToSend(err) {
    if(retryCount < 5) {
      retry.retryLater(retryCount++, send);
    } else {
      console.warn('Error sending error traces to kadira server');
      if(callback) callback(err);
    }
  }

  function send() {
    sendFunction(endpoint, payload, function(err, response) {
      if(err) {
        tryToSend(err);
      } else {
        if(callback) callback(null, response);
      }
    });
  }
};

Kadira._getSendFunction = function() {
  return (Meteor.isServer)? Kadira._serverSend : Kadira._clientSend;
};

Kadira._clientSend = function (endpoint, payload, callback) {
  $.ajax({
    type: 'POST',
    url: endpoint,
    contentType: 'application/json',
    data: JSON.stringify(payload),
    error: function(err) {
      callback(err);
    },
    success: function(data) {
      callback(null, data);
    }
  }); 
}

Kadira._serverSend = function (endpoint, payload, callback) {
  var Fiber = Npm.require('fibers');
  new Fiber(function() {
    try {
      var httpOptions = {
        data: payload
      };

      var response = HTTP.call('POST', endpoint, httpOptions);
      if(callback) callback(null, response.data);
    } catch(ex) {
      if(callback) callback(ex);
    }
  }).run();
}