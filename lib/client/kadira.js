Kadira = {};
Kadira.options = __meteor_runtime_config__.kadira || {};
if(Kadira.options.appId && Kadira.options.endpoint) {
  Kadira.connected = true;
}

Kadira.syncedDate = new Ntp(Kadira.options.endpoint);
// ntp time sync uses jsonp which can block rendering the page
// call ntp sync after the page is loaded and rendered
Meteor.startup(function() {
  Kadira.syncedDate.sync();
});

_.defaults(Kadira.options, {
  errorDumpInterval: 1000*60,
  maxErrorsPerInterval: 10,
  collectAllStacks: false,
  enableErrorTracking: false,
});

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

if(window.Zone && Zone.inited) {
  Zone.collectAllStacks = Kadira.options.collectAllStacks;
}

if(window.XDomainRequest) {
  fixInternetExplorerXDR();
}

Kadira.enableErrorTracking = function () {
  Kadira.options.enableErrorTracking = true;
};

Kadira.disableErrorTracking = function () {
  Kadira.options.enableErrorTracking = false;
};

Kadira.trackError = function (type, message, options) {
  if(Kadira.options.enableErrorTracking && type && message) {
    var now = (new Date()).getTime();
    options = options || {};
    _.defaults(options, {subType: 'client', stacks: ''});
    Kadira.errors.sendError({
      appId : Kadira.options.appId,
      name : message,
      source : 'client',
      startTime : now,
      type : type,
      subType : options.subType,
      info : getBrowserInfo(),
      stacks : JSON.stringify([{at: now, events: [], stack: options.stacks}]),
    });
  }
};

if(Kadira.connected && Kadira.options.enableErrorTracking) {
  Kadira.enableErrorTracking();
}
