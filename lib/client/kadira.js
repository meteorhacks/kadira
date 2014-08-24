Kadira = {};
Kadira.options = __meteor_runtime_config__.kadira || {};
Kadira.options.errorDumpInterval = Kadira.options.errorDumpInterval || 1000*60;
Kadira.options.maxErrorsPerInterval = Kadira.options.maxErrorsPerInterval || 10;

if(Kadira.options.collectAllStacks === undefined) {
  Kadira.options.collectAllStacks = false;
}

Kadira.send = function (payload) {
  var endpoint = Kadira.options.endpoint + '/errors';
  var retryCount = 0;
  var retry = new Retry({
    minCount: 1,
    minTimeout: 0,
    baseTimeout: 1000*5,
    maxTimeout: 1000*60,
  });
  tryToSend();

  function tryToSend() {
    if(retryCount < 5) {
      retry.retryLater(retryCount++, function () {
        $.ajax({
          type: 'POST',
          url: endpoint,
          contentType: 'application/json',
          data: JSON.stringify(payload),
          error: tryToSend
        });
      });
    } else {
      console.warn('Error sending error traces to kadira server');
    }
  }
}

if(Kadira.options && Kadira.options.endpoint) {
  Kadira.syncedDate = new Ntp(Kadira.options.endpoint);
  Kadira.errors = new KadiraErrorModel();
  Kadira.connected = true;
  setInterval(Kadira.sendSavedErrors, Kadira.options.errorDumpInterval);

  // ntp time sync uses jsonp which can block rendering the page
  // call ntp sync after the page is loaded and rendered
  Meteor.startup(function() {
    Kadira.syncedDate.sync();
  });
}

/**
 * IE8 and IE9 does not support CORS with the usual XMLHttpRequest object
 * If XDomainRequest exists, use it to send errors.
 */
if (window.XDomainRequest) {
  $.ajaxTransport(function(s) {
    return {
      send: function (headers, callback) {
        var xdr = new XDomainRequest();
        var data = s.data || null;

        xdr.onload = function () {
          var headers = {'Content-Type': xdr.contentType};
          callback(200, 'OK', {text: xdr.responseText}, headers);
        }

        xdr.onerror = function () {
          callback(404);
        }

        xdr.open(s.type, s.url);
        xdr.send(data);
      }
    };
  });
}
