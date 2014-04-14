var originalSend = Email.send;

Email.send = function(options) {
  var apmInfo = Apm._getInfo();
  if(apmInfo) {
    var eventId = Apm.tracer.event(apmInfo.trace, 'email');
  }
  try {
    var ret = originalSend.call(this, options);
    if(eventId) {
      Apm.tracer.eventEnd(apmInfo.trace, eventId);
    }
    return ret;
  } catch(ex) {
    if(eventId) {
      Apm.tracer.eventEnd(apmInfo.trace, eventId, {err: ex.message});
    }
    throw ex;
  }
};