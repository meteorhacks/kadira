var originalMeteorDebug = Meteor._debug;

Meteor._debug = function(message, stack) {
  if(!window.zone) {
    var err = new Error(message);
    err.stack = stack;
    var stack = getNormalizedStacktrace(err);
    var now = Date.now();
    Kadira.trackError({
      appId : Kadira.options.appId,
      name : message,
      source : 'client',
      startTime : now,
      type : 'meteor._debug',
      info : getBrowserInfo(),
      stacks : [{at: now, events: [], stack: stack}],
      count: 1,
    });
  }

  originalMeteorDebug(message, stack);
};
