var originalSend = Email.send;

Email.send = function(options) {
  var apmInfo = Kadira._getInfo();
  if(apmInfo) {
    var eventId = Kadira.tracer.event(apmInfo.trace, 'email');
  }
  try {
    var ret = originalSend.call(this, options);
    if(eventId) {
      Kadira.tracer.eventEnd(apmInfo.trace, eventId);
    }
    return ret;
  } catch(ex) {
    if(eventId) {
      Kadira.tracer.eventEnd(apmInfo.trace, eventId, {err: ex.message});
    }
    throw ex;
  }
};