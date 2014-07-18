
/**
 * Reset zone.events to an empty array when creating a new zone.
 * Otherwise events from parent zones will be copied to child zones.
 */
var originalZoneFork = zone.fork;
zone.fork = function (locals) {
  var zone = originalZoneFork.call(this, locals);
  zone.events = [];
  return zone;
}

/**
 * Hijack Meteor.call to add events
 */
var originalMeteorCall = Meteor.call;
Meteor.call = function () {
  var args = Array.prototype.slice.call(arguments);
  var eventId = getNextEventId();

  if(args.length) {
    var name = args[0];
    var callback = args[args.length - 1];
    if(typeof callback === 'function') {
      // Callback function exists. Don't add it to method args.
      // All arguments except first and callback must be method args
      zone.events.push({
        id: eventId,
        type: 'Meteor.call',
        name: name,
        args: _.initial(_.rest(args))
      });

      // Hijack callback to add result event info
      // Both event information have same eventId
      args[args.length - 1] = function (_error, result) {
        var args = Array.prototype.slice.call(arguments);
        var error = _error ? _error.message : undefined;
        zone.events.push({
          id: eventId,
          type: 'Meteor.call:result',
          name: name,
          error: error,
          result: result
        });
        callback.apply(this, args);
      };
    } else {
      // There's no callback function.
      // All arguments except first must be method args
      zone.events.push({
        id: eventId,
        type: 'Meteor.call',
        name: name,
        args: _.rest(args)
      });
    }
  }

  return originalMeteorCall.apply(this, args);
};

/**
 * Hijack Meteor.subscribe to add events
 */
var originalMeteorSubscribe = Meteor.subscribe;
Meteor.subscribe = function () {
  var args = Array.prototype.slice.call(arguments);
  var eventId = getNextEventId();

  if(args.length) {
    var name = args[0];
    var callback = args[args.length - 1];
    if(typeof callback === 'function') {
      // Callback function exists. Don't add it to subscription args.
      // All arguments except first and callback must be subscription args
      zone.events.push({
        id: eventId,
        type: 'Meteor.subscribe',
        name: name,
        args: _.initial(_.rest(args))
      });

      // Hijack callback to add result event info
      // Both event information have same eventId
      args[args.length - 1] = function (_error, result) {
        var args = Array.prototype.slice.call(arguments);
        var error = _error ? _error.message : undefined;
        zone.events.push({
          id: eventId,
          type: 'Meteor.subscribe:onReady',
          name: name,
          error: error,
          result: result
        });
        callback.apply(this, args);
      };
    } else if(typeof callback === 'object') {
      // Callback functions exist. Don't add them to subscription args.
      // All arguments except first and callback must be subscription args
      zone.events.push({
        id: eventId,
        type: 'Meteor.subscribe',
        name: name,
        args: _.initial(_.rest(args))
      });

      // Hijack callbacks to add result event info
      // Both event information have same eventId
      ['onReady', 'onError'].forEach(function (funName) {
        if(typeof callback[funName] === 'function') {
          var originalCallback = callback[funName];
          callback[funName] = function (_error, result) {
            var args = Array.prototype.slice.call(arguments);
            var error = _error ? _error.message : undefined;
            zone.events.push({
              id: eventId,
              type: 'Meteor.subscribe:'+funName,
              name: name,
              error: error,
              result: result
            });
            originalCallback.apply(this, args);
          }
        }
      })
    } else {
      // There's no callback function.
      // All arguments except first must be subscription args
      zone.events.push({
        id: eventId,
        type: 'Meteor.subscribe',
        name: name,
        args: _.rest(args)
      });
    }
  }

  return originalMeteorSubscribe.apply(this, args);
};
