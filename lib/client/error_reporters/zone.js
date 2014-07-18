if(Kadira.options && Kadira.options.appId) {
  Zone.Reporters.add('kadira', kadiraZoneReporter);
}

function kadiraZoneReporter(zone) {
  Kadira.sendErrors([{
    appId : Kadira.options.appId,
    name : getErrorName(zone.currentStack._e),
    source : 'client',
    startTime : zone.runAt,
    type : 'zone',
    info : getBrowserInfo(),
    stack : getErrorStack(zone),
  }]);
}
