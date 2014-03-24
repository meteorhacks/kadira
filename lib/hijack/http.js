var originalCall = HTTP.call;

HTTP.call = function(method, url) {
  var apmInfo = Apm._getInfo();
  if(apmInfo) {
    var eventId = Apm.tracer.event(apmInfo.trace, 'http', {method: method, url: url});
  }

  try {
    var response = originalCall.apply(this, arguments);

    //if the user supplied an asynCallback, we don't have a response object and it handled asynchronously
    //we need to track it down to prevent issues like: #3
    var endOptions = HaveAsyncCallback(arguments)? {async: true}: {statusCode: response.statusCode};
    if(eventId) {
      Apm.tracer.eventEnd(apmInfo.trace, eventId, endOptions);
    }
    return response;
  } catch(ex) {
    if(eventId) {
      Apm.tracer.eventEnd(apmInfo.trace, eventId, {err: ex.message});
    }
    throw ex;
  }
};