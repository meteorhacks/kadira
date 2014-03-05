var originalCall = HTTP.call;

HTTP.call = function(method, url) {
  var eventId = NotificationManager.methodTrackEvent('http', {method: method, url: url});
  try {
    var response = originalCall.apply(this, arguments);

    //if the user supplied an asynCallback, we don't have a response object and it handled asynchronously
    //we need to track it down to prevent issues like: #3
    var endOptions = HaveAsyncCallback(arguments)? {async: true}: {statusCode: response.statusCode};
    NotificationManager.methodTrackEventEnd(eventId, 'http', endOptions);
    return response;
  } catch(ex) {
    NotificationManager.methodTrackEventEnd(eventId, 'http', {err: ex.message});
    throw ex;
  }
};