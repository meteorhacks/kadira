Kadira = {};
Kadira.options = __meteor_runtime_config__.kadira || {};

if(Kadira.options.appId && Kadira.options.endpoint) {
  Kadira.connected = true;
}

setupNtpSync = function () {
  Kadira.syncedDate = new Ntp(Kadira.options.endpoint);
  // ntp time sync uses jsonp which can block rendering the page
  // call ntp sync after the page is loaded and rendered
  Meteor.startup(function() {
    Kadira.syncedDate.sync();
  });
}

setupErrorTracking = function () {
  var options = Kadira.options;
  options.errorDumpInterval = options.errorDumpInterval || 1000*60;
  options.maxErrorsPerInterval = options.maxErrorsPerInterval || 10;
  options.collectAllStacks = options.collectAllStacks || false;
  Kadira.errors = new KadiraErrorModel({
    waitForNtpSyncInterval: 1000 * 5, // 5 secs
    intervalInMillis: 1000 * 60 * 1, // 1minutes
    maxErrorsPerInterval: 5
  });

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
        retry.retryLater(retryCount++, send);
      } else {
        console.warn('Error sending error traces to kadira server');
      }
    }

    function send () {
      $.ajax({
        type: 'POST',
        url: endpoint,
        contentType: 'application/json',
        data: JSON.stringify(payload),
        error: tryToSend
      });
    }
  };

  if(window.XDomainRequest) {
    fixInternetExplorerXDR();
  }
}

enableErrorTracking = function () {
  setupNtpSync();
  setupErrorTracking();
  trackMeteorDebugErrors();
  trackWindowOnError();
  trackZoneErrors();
}

if(Kadira.connected && Kadira.options.enableErrorTracking) {
  enableErrorTracking();
}
