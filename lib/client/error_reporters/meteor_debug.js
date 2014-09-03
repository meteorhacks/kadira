var originalMeteorDebug = Meteor._debug;

Meteor._debug = function(message, stack) {
  // track only if error tracking is enabled
  if(!Kadira.options.enableErrorTracking) {
    return originalMeteorDebug(message, stack);
  }

  // do not track if a zone is available (let zone handle the error)
  if(window.zone) {
    return originalMeteorDebug(message, stack);
  }

  // sometimes Meteor._debug is called with the stack concat to the message
  // FIXME Meteor._debug can be called in many ways
  if(message && stack === undefined) {
    stack = getStackFromMessage(message);
    message = firstLine(message);
  }

  var now = (new Date().getTime());
  Kadira.errors.sendError({
    appId : Kadira.options.appId,
    name : message,
    type : 'client',
    startTime : now,
    subType : 'meteor._debug',
    info : getBrowserInfo(),
    stacks : JSON.stringify([{at: now, events: [], stack: stack}]),
  });

  return originalMeteorDebug(message, stack);
};

var stackRegex = /^\s+at\s.+$/gm;
function getStackFromMessage (message) {
  // add empty string to add the empty line at start
  var stack = [''];
  var match;
  while(match = stackRegex.exec(message)) {
    stack.push(match[0]);
  }
  return stack.join('\n');
}

function firstLine (message) {
  return message.split('\n')[0];
}
