var originalSend = Email.send;

Email.send = function(options) {
  var eventId = NotificationManager.methodTrackEvent('email');
  var ret = originalSend.call(this, options);
  NotificationManager.methodTrackEventEnd(eventId, 'email');

  return ret;
};