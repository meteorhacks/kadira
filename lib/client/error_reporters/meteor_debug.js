var originalMeteorDebug = Meteor._debug;

Meteor._debug = function(message, stack) {
  if(!window.zone) {
    // sometimes Meteor._debug is called with the stack concat to the message
    if(message && stack === undefined) {
      stack = getStackFromMessage(message);
      message = firstLine(message);
    }

    // stacktrace.js requires an Error object to create the normalized stack
    var err = new Error(message);
    err.stack = stack;
    var stack = getNormalizedStacktrace(err);
    var now = (new Date().getTime());
    Kadira.errors.sendError({
      appId : Kadira.options.appId,
      name : message,
      source : 'client',
      startTime : now,
      type : 'meteor._debug',
      info : getBrowserInfo(),
      stacks : JSON.stringify([{at: now, events: [], stack: stack}]),
    });
  }

  originalMeteorDebug(message, stack);
};

var stackRegex = /^\s+at\s.+$/gm;
function getStackFromMessage (message) {
  var stack = [];
  var match;
  while(match = stackRegex.exec(message)) {
    stack.push(match[0]);
  }
  return stack.join('\n');
}

function firstLine (message) {
  return message.split('\n')[0];
}
