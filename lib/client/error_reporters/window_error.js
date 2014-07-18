var prevWindowOnError = window.onerror;
window.onerror = function(message, url, line, stack) {
  var now = Date.now();
  stack = stack || 'window@'+url+':'+line+':0';
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
