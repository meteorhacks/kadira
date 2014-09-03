process.on('uncaughtException', function (err) {
  // let the server crash normally if error tracking is disabled
  if(!Kadira.options.enableErrorTracking) {
    throw err;
  }

  // looking for already tracked errors and throw them immediately
  // throw error immediately if kadira is not ready
  if(err._tracked || !Kadira.connected) {
    throw err;
  }

  var trace = getTrace(err, 'server-crash', 'uncaughtException');
  Kadira.models.error.trackError(err, trace);
  Kadira.sendPayload(function () {
    clearTimeout(timer);
    throwError(err);
  });

  var timer = setTimeout(function () {
    throwError(err);
  }, 1000*10);

  function throwError(err) {
    // sometimes error came back from a fiber.
    // But we don't fibers to track that error for us
    // That's why we throw the error on the nextTick
    process.nextTick(function() {
      // we need to mark this error where we really need to throw
      err._tracked = true;
      throw err;
    });
  }
});

var originalMeteorDebug = Meteor._debug;
Meteor._debug = function (message, stack) {
  if(!Kadira.options.enableErrorTracking) {
    return originalMeteorDebug.call(this, message, stack);
  }

  // We've changed `stack` into an object at method and sub handlers so we can
  // ignore them here. These errors are already tracked so don't track again.
  if(typeof stack !== 'object') {
    // only send to the server, if only connected to kadira
    if(Kadira.connected) {
      var error = new Error(message);
      error.stack = stack;
      var trace = getTrace(error, 'server-internal', 'Meteor._debug');
      Kadira.models.error.trackError(error, trace);
    }
  } else {
    stack = stack.stack;
  }

  return originalMeteorDebug.call(this, message, stack);
}

function getTrace(err, type, subType) {
  return {
    type: type,
    subType: subType,
    name: err.message,
    errored: true,
    at: Kadira.syncedDate.getTime(),
    events: [
      ['start', 0, {}],
      ['error', 0, {error: {message: err.message, stack: err.stack}}]
    ],
    metrics: {
      total: 0
    }
  };
}
