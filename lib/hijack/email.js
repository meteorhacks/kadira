var originalSend = Email.send;

Email.send = function(options) {
  var eventId = NotificationManager.methodTrackEvent('email');
  try {
    var ret = originalSend.call(this, options);
    NotificationManager.methodTrackEventEnd(eventId, 'email');
    return ret;
  } catch(ex) {
    NotificationManager.methodTrackEventEnd(eventId, 'email', {err: ex.message});
    throw ex;
  }
};