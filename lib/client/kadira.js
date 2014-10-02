Kadira = {};
Kadira.options = __meteor_runtime_config__.kadira || {};
if(Kadira.options.appId && Kadira.options.endpoint) {
  Kadira.connected = true;
}

Kadira.syncedDate = new Ntp(Kadira.options.endpoint);
// ntp time sync uses jsonp which can block rendering the page
// call ntp sync after the page is loaded and rendered
Meteor.startup(function() {
  if(!Meteor.isCordova) {
    Kadira.syncedDate.sync();
    return;
  }

  Meteor.subscribe('kadira_settings');
  new Meteor.Collection('kadira_settings').find().observe({
    'added': function (options) {
      Kadira.options = options;

      // update the endpoint of NTP and set status to connected (if success)
      if(Kadira.options.appId && Kadira.options.endpoint) {
        Kadira.syncedDate.endpoint = Kadira.options.endpoint;
        Kadira.syncedDate.sync();
        Kadira.connected = true;
      }

      if(Kadira.connected && Kadira.options.enableErrorTracking) {
        Kadira.enableErrorTracking();
      }
    }
  });
});

_.defaults(Kadira.options, {
  errorDumpInterval: 1000*60,
  maxErrorsPerInterval: 10,
  collectAllStacks: false,
  enableErrorTracking: false,
});

Kadira.errors = new ErrorModel({
  waitForNtpSyncInterval: 1000 * 5, // 5 secs
  intervalInMillis: 1000 * 60 * 1, // 1minutes
  maxErrorsPerInterval: 5
});

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
