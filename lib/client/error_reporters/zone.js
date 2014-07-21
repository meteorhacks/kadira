if(Kadira.options && Kadira.options.appId) {
  Zone.Reporters.add('kadira', kadiraZoneReporter);
}

function kadiraZoneReporter(zone) {
  Kadira.sendErrors([{
    appId : Kadira.options.appId,
    name : zone.erroredStack._e.message,
    source : 'client',
    startTime : zone.runAt,
    type : 'zone',
    info : getBrowserInfo(),
    stacks : getErrorStack(zone),
  }]);
}
