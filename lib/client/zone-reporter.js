if(Kadira.options && Kadira.options.appId) {
  Zone.Reporters.add('kadira', kadiraZoneReporter);
}

function kadiraZoneReporter(zone) {
  Kadira.sendErrors([{
    appId : Kadira.options.appId,
    name : getErrorName(zone),
    source : 'client',
    startTime : zone.runAt,
    type : 'zone',
    info : Kadira.getBrowserInfo(),
    stack : getErrorStack(zone),
  }]);
}

function getErrorName (zone) {
  var error = zone.currentStack._e;
  return error.name + ': ' + error.message;
}

function getErrorStack (zone) {
  var trace = [];
  while (zone && zone.currentStack) {
    trace.push({
      at: zone.runAt,
      stack: getNormalizedStacktrace(zone),
      events: zone.events || []
    });
    zone = zone.parent;
  };
  return trace;
}

function getNormalizedStacktrace (zone) {
  return printStackTrace({e: zone.currentStack._e})
    .filter(stackFramesFilter)
    .join('\n');
}

function stackFramesFilter (line) {
  var filterRegExp = /\/packages\/zones\/assets\/|^Error$/;
  return !line.match(filterRegExp);
}
