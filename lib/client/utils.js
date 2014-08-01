getBrowserInfo = function () {
  return {
    browser: window.navigator.userAgent,
    userId: Meteor.userId && Meteor.userId(),
    url: location.href,
    resolution: getResolution()
  };
}

getResolution = function () {
  if(screen && screen.width && screen.height) {
    var resolution = screen.width + 'x' + screen.height;
    return resolution;
  }
}

getErrorStack = function (zone) {
  var trace = [];
  var eventMap = zone.eventMap || {};
  var infoMap = zone.infoMap || {};

  trace.push({
    at: Date.now(),
    stack: getNormalizedStacktrace(zone.erroredStack._e)
  });

  while (zone && zone.currentStack) {
    var stack = getNormalizedStacktrace(zone.currentStack._e);
    var events = eventMap[zone.id];
    var info = getInfoArray(infoMap[zone.id]);
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
      info: info,
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
}

getInfoArray = function (info) {
  return _(info || {}).map(function (value, type) {
    value.type = type;
    return value;
  })
}

formatTraceLine = function (oldLine) {
  if(oldLine) {
    //parts => ['functionName', 'url:line:col']
    var parts = oldLine.split('@');
    var line = '    at ';
    var origin = getCurrentOrigin();
    var path = parts[1].replace(origin + '/', '', 'gi');
    if(parts[0] === '{anonymous}()') {
      line += path;
    } else {
      line += parts[0] + ' ('+path+')';
    }
    return line;
  }
}

getCurrentOrigin = function () {
  // Internet Explorer doesn't have window.location.origin
  return window.location.origin || window.location.protocol
  + window.location.hostname
  + window.location.port;
}

var filterRegExp = /\/packages\/zones\/assets\/|^Error$/;
stackFramesFilter = function (line) {
  return !line.match(filterRegExp);
}

getTime = function () {
  if(Kadira && Kadira.syncedDate) {
    return Kadira.syncedDate.getTime();
  } else {
    return Date.now();
  }
}
