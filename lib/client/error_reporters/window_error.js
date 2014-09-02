var prevWindowOnError = window.onerror;

trackWindowOnError = function () {
  window.onerror = function(message, url, line, col, error) {
    url = url || '<anonymous>';
    line = line || 0;
    col = col || 0;

    if(error) {
      var stack = error.stack;
    } else {
      var stack = 'Error:\n    at window.onerror ('+url+':'+line+':'+col+')';
    }

    if(Kadira.connected) {
      var now = (new Date().getTime());
      Kadira.errors.sendError({
        appId : Kadira.options.appId,
        name : message,
        source : 'client',
        startTime : now,
        type : 'window.onerror',
        info : getBrowserInfo(),
        stacks : JSON.stringify([{at: now, events: [], stack: stack}]),
      });
    }

    if(prevWindowOnError && typeof prevWindowOnError === 'function') {
      prevWindowOnError(message, url, line, col, error);
    }
  }
}
