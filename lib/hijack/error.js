
process.on('uncaughtException', function (err) {
  Kadira.models.error.trackError(err, getTrace(err));
  Kadira.sendPayload(function () {
    clearTimeout(timer);
    throw err;
  });

  var timer = setTimeout(function () {
    throw err;
  }, 1000*10);
});

function getTrace(err) {
  return {
    type: 'uncaught',
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
