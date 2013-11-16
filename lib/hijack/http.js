var originalCall = HTTP.call;

HTTP.call = function(method, url) {
  NotificationManager.methodTrackEvent('httpstart', {method: method, url: url});
  var ret = originalCall.apply(this, arguments);
  NotificationManager.methodTrackEvent('httpend', {statusCode: ret.statusCode});

  return ret;
};