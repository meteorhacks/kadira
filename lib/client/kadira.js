
Kadira = {};
Kadira.options = __meteor_runtime_config__.kadira;

if(Kadira.options && Kadira.options.endpoint) {
  Kadira.syncedDate = new Ntp(Kadira.options.endpoint);
  Kadira.syncedDate.sync();
}

/**
 * Send error metrics/traces to kadira server
 * @param  {Object} payload Contains browser info and error traces
 */
Kadira.sendErrors = function (errors) {
  var retryCount = 0;
  var endpoint = Kadira.options.endpoint + '/errors';
  var retry = new Retry({
    minCount: 1,
    minTimeout: 0,
    baseTimeout: 1000*5,
    maxTimeout: 1000*60,
  });

  var payload = {
    errors: JSON.stringify(errors)
  };

  tryToSend();

  function tryToSend() {
    if(retryCount < 5) {
      retry.retryLater(retryCount++, sendPayload);
    } else {
      console.warn('Error sending error traces to kadira server');
    }
  }

  function sendPayload () {
    $.ajax({
      url: endpoint,
      data: payload,
      jsonp: 'callback',
      dataType: 'jsonp',
      error: tryToSend
    });
  }
}

Kadira.getBrowserInfo = function () {
  return {
    browser: window.navigator.userAgent,
    userId: Meteor.userId,
    url: location.href
  };
}

var prevWindowOnError = window.onerror;
window.onerror = function(message, url, line) {
  var now = Date.now();
  var stack = 'window@'+url+':'+line+':0';
  Kadira.sendErrors([{
    appId : Kadira.options.appId,
    name : message,
    source : 'client',
    startTime : now,
    type : 'window.onerror',
    info : Kadira.getBrowserInfo(),
    stack : [{at: now, events: [], stack: stack}],
  }]);

  if(prevWindowOnError && typeof prevWindowOnError === 'function') {
    prevWindowOnError(message, url, line);
  }
}
