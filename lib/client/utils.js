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

getErrorStack = function (zone, callback) {
  var trace = [];
  var eventMap = zone.eventMap || {};
  var infoMap = zone.infoMap || {};

  trace.push({
    at: (new Date().getTime()),
    stack: getNormalizedStacktrace(zone.erroredStack._e)
  });

  processZone();
  function processZone() {
    // we assume, first two zones are not interesting 
    // bacause, they are some internal meteor loading stuffs
    if(zone && zone.depth > 2) {
      var stack = "";
      if(zone.currentStack) {
        stack = getNormalizedStacktrace(zone.currentStack._e);
      }

      var events = eventMap[zone.id];
      var info = getInfoArray(infoMap[zone.id]);
      var ownerArgsEvent = events && events[0] && events[0].type == 'owner-args' && events.shift();
      var runAt = (ownerArgsEvent)? ownerArgsEvent.at : zone.runAt;
      var ownerArgs = (ownerArgsEvent)? _.toArray(ownerArgsEvent.args) : [];

      // limiting
      events = _.map(_.last(events, 5), checkSizeAndPickFields(100));
      info = _.map(_.last(info, 5), checkSizeAndPickFields(100));
      ownerArgs = checkSizeAndPickFields(200)(_.first(ownerArgs, 5));

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

      setTimeout(processZone, 0);
    } else {
      callback(trace);
    }
  }
}

getNormalizedStacktrace = function (e) {
  var trace = printStackTrace({e: e});
  trace = _.filter(trace, stackFramesFilter);
  trace = _.map(trace, formatTraceLine);
  return trace.join('\n');
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

    // Sometimes stacktrace.js fails to parse IE8 errors
    // return the original trace line
    if(parts.length < 2) {
      return oldLine;
    }

    // merge all parts except the first if there are more than a '@' characters
    // I'm not sure whether this can ever happen with Stacktrace.js
    if(parts.length > 2) {
      var messageParts = parts.slice(1);
      parts.splice(0, 1);
      parts[1] = messageParts.join('@');
    }

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
    return (new Date().getTime());
  }
}

checkSizeAndPickFields = function(maxFieldSize) {
  return function(obj) {
    maxFieldSize = maxFieldSize || 100;
    for(var key in obj) {
      var value = obj[key];
      try {
        var valueStringified = JSON.stringify(value);
        if(valueStringified.length > maxFieldSize) {
          obj[key] = valueStringified.substr(0, maxFieldSize) + " ...";
        } else {
          obj[key] = value;
        }
      } catch(ex) {
        obj[key] = 'Error: cannot stringify value';
      }
    }
    return obj;
  }
}