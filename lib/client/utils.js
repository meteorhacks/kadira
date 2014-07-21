getBrowserInfo = function () {
  return {
    browser: window.navigator.userAgent,
    userId: Meteor.userId,
    url: location.href
  };
}

getErrorStack = function (zone) {
  var trace = [];
  var eventMap = zone.eventMap || {};

  trace.push({
    at: Date.now(),
    stack: getNormalizedStacktrace(zone.erroredStack._e)
  });

  while (zone && zone.currentStack) {
    var stack = getNormalizedStacktrace(zone.currentStack._e);
    trace.push({
      at: zone.runAt,
      stack: stack,
      owner: zone.owner,
      events: eventMap[zone.id]
    });
    zone = zone.parent;
  };
  return trace;
}

getNormalizedStacktrace = function (e) {
  return printStackTrace({e: e})
    .filter(stackFramesFilter)
    .join('\n');
}

var filterRegExp = /\/packages\/zones\/assets\/|^Error$/;
stackFramesFilter = function (line) {
  return !line.match(filterRegExp);
}
