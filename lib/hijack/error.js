
process.on('uncaughtException', function (err) {
  Kadira.models.error.trackError(err, 'uncaught');
  Kadira.sendPayload(function () {
    clearTimeout(timer);
    throw err;
  });

  var timer = setTimeout(function () {
    throw err;
  }, 1000*10);
});
