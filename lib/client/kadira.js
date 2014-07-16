
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
function sendPayload (payload) {
  var retryCount = 0;
  var endpoint = Kadira.options.endpoint + '/errors';
  var retry = new Retry({
    minCount: 0,
    baseTimeout: 1000*5,
    maxTimeout: 1000*60,
  });

  tryToSend();

  function tryToSend() {
    if(retryCount++ < 5) {
      retry.retryLater(retryCount++, sendPayload);
    } else {
      console.warn('Error sending error traces to kadira server');
    }
  }

  function sendPayload () {
    $.ajax({url: endpoint, data: payload, error: tryToSend});
  }

}

function addBrowserInfo (errorInfo) {
  _(errorInfo).extend({
    appId: Kadira.options.appId,
    browser: window.navigator.userAgent,
    userId: Meteor.userId,
    randomId: Meteor.uuid(),
  });
}
