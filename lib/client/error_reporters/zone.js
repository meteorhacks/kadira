
if(window.Zone && Zone.inited) {
  Zone.Reporters.add('kadira', kadiraZoneReporter);
}

function kadiraZoneReporter(zone) {
  // track only if error tracking is enabled
  if(!Kadira.options.enableErrorTracking) {
    return;
  }

  var errorName = zone.erroredStack._e.message;
  if(Kadira.errors.isErrorExists(errorName)) {
    Kadira.errors.increamentErrorCount(errorName);
  } else if(Kadira.errors.canSendErrors()) {
    getErrorStack(zone, function(stacks) {
      Kadira.errors.sendError({
        appId : Kadira.options.appId,
        name : zone.erroredStack._e.message,
        type : 'client',
        startTime : zone.runAt,
        subType : 'zone',
        info : getBrowserInfo(),
        stacks : JSON.stringify(stacks),
      });
    });
  }
}
