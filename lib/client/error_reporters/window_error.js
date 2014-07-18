var prevWindowOnError = window.onerror;
window.onerror = function(message, url, line) {
  var now = Date.now();
  var stack = 'window@'+url+':'+line+':0';
  Kadira.sendErrors([{
    appId : Kadira.options.appId,
    name : message,
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
