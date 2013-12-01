var originalSend = Email.send;

Email.send = function(options) {
  NotificationManager.methodTrackEvent('email');
  var ret = originalSend.call(this, options);
  NotificationManager.methodTrackEvent('emailend');

  return ret;
};