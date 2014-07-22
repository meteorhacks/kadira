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
    var events = eventMap[zone.id];
    var ownerArgsEvent = events && events[0] && events[0].type == 'owner-args' && events.shift();
    var runAt = (ownerArgsEvent)? ownerArgsEvent.at : zone.runAt;
    var ownerArgs = (ownerArgsEvent)? _.toArray(ownerArgsEvent.args) : [];

    zone.owner && delete zone.owner.zoneId;

    trace.push({
      createdAt: zone.createdAt,
      runAt: runAt,
      stack: stack,
      owner: zone.owner,
      ownerArgs: ownerArgs,
      events: events,
      zoneId: zone.id
    });
    zone = zone.parent;
  };
  return trace;
}

getNormalizedStacktrace = function (e) {
  return printStackTrace({e: e})
    .filter(stackFramesFilter)
    .map(formatTraceLine)
    .join('\n');

  function formatTraceLine(line) {
    if(line) {
      //parts => ['functionName', 'url:line:col']
      var parts = line.split('@');
      var formated = '    at ';
      var path = parts[1].replace(location.origin + '/', '', 'gi');
      if(parts[0] === '{anonymous}()') {
        formated += '' + path;
      } else {
        formated += parts[0] + ' ('+path+')';
      }
      return formated;
    }
  }
}

var filterRegExp = /\/packages\/zones\/assets\/|^Error$/;
stackFramesFilter = function (line) {
  return !line.match(filterRegExp);
}
