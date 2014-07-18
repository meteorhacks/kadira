
getBrowserInfo = function () {
  return {
    browser: window.navigator.userAgent,
    userId: Meteor.userId,
    url: location.href
  };
}

getErrorName = function (e) {
  return e.name + ': ' + e.message;
}

getErrorStack = function (zone) {
  var trace = [];
  var stack = getNormalizedStacktrace(zone);
  while (zone && zone.currentStack) {
    trace.push({
      at: zone.runAt,
      stack: stack,
      events: zone.events
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
