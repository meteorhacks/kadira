if(window.Zone && Zone.inited && Kadira.options.appId) {
  Zone.Reporters.add('kadira', kadiraZoneReporter);
  Zone.prototype.getTime = getTime;
  Zone.collectAllStacks = Kadira.options.collectAllStacks;
}

function kadiraZoneReporter(zone) {
  Kadira.trackError({
    appId : Kadira.options.appId,
    name : zone.erroredStack._e.message,
    source : 'client',
    startTime : zone.runAt,
    type : 'zone',
    info : getBrowserInfo(),
    stacks : getErrorStack(zone),
    count: 1,
  });
}
