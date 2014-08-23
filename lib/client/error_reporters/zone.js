if(window.Zone && Zone.inited && Kadira.options.appId) {
  Zone.Reporters.add('kadira', kadiraZoneReporter);
  Zone.prototype.getTime = getTime;
  Zone.collectAllStacks = Kadira.options.collectAllStacks;
}

function kadiraZoneReporter(zone) {
  var errorName = zone.erroredStack._e.message;
  // TODO: check for error name existance; if so just increase the counter
  /*
    if(Kadira.errors.isErrorExists(name)) {
      Kadira.errors.increamentError(name);
    } else if(Kadira.errors.canSendErrors()) {
      getErrorStack(...)
    }
  */
  getErrorStack(zone, function(stacks) {
    Kadira.trackError({
      appId : Kadira.options.appId,
      name : zone.erroredStack._e.message,
      source : 'client',
      startTime : zone.runAt,
      type : 'zone',
      info : getBrowserInfo(),
      stacks : stacks,
      count: 1,
    });
  });
}
