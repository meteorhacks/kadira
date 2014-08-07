process.on('uncaughtException', function (err) {
  // looking for already tracked errors and throw them immediately
  if(err._tracked) {
    throw err;
  }

  Kadira.models.error.trackError(err, getTrace(err));
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

function getTrace(err) {
  return {
    type: 'server-crash',
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
