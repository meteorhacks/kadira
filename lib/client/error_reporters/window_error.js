var prevWindowOnError = window.onerror;
window.onerror = function(message, url, line, stack) {
  var now = Date.now();

  if(typeof stack !== 'object') {
    // if there's a fourth argument it must be the column number
    var colNumber = stack || 0;
    stack = 'window@'+url+':'+line+':'+colNumber;
  }

  // stacktrace.js takes an exception as input
  var mockException = {stack: stack};
  stack = getNormalizedStacktrace(mockException);

  Kadira.sendErrors([{
    appId : Kadira.options.appId,
    name : 'Error: ' + message,
    source : 'client',
    startTime : now,
    type : 'window.onerror',
    info : getBrowserInfo(),
    stack : [{at: now, events: [], stack: stack}],
  }]);

  if(prevWindowOnError && typeof prevWindowOnError === 'function') {
    prevWindowOnError(message, url, line);
  }
}
