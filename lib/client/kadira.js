
Kadira = {};
Kadira.options = __meteor_runtime_config__.kadira;
Kadira.options.errorDumpInterval = Kadira.options.errorDumpInterval || 1000*60;
Kadira.options.maxErrorsPerInterval = Kadira.options.maxErrorsPerInterval || 10;

if(Kadira.options && Kadira.options.endpoint) {
  Kadira.syncedDate = new Ntp(Kadira.options.endpoint);
  Kadira.syncedDate.sync();
  setInterval(Kadira.sendSavedErrors, Kadira.options.errorDumpInterval);
}

Kadira.errors = {};
Kadira.sendSavedErrors = function () {
  var errors = _.values(Kadira.errors);
  // only send errors which have occured again
  errors = errors.filter(function (error) {
    return error.count > 0;
  });

  Kadira.errors = {};
  if(errors && errors.length) {
    Kadira.sendErrors(errors);
  }
}

Kadira.trackError = function (error) {
  if(Kadira.errors[error.name]) {
    Kadira.errors[error.name].count++;
  } else {
    Kadira.sendErrors([error]);
    Kadira.errors[error.name] = _.clone(error);
    Kadira.errors[error.name].count = 0;
  }
}

/**
 * Send error metrics/traces to kadira server
 * @param  {Object} payload Contains browser info and error traces
 */
Kadira.sendErrors = function (errors) {
  errors = errors.slice(0, Kadira.options.maxErrorsPerInterval);
  errors.forEach(Kadira.prepareError);
  var payload = {errors: JSON.stringify(errors)};
  Kadira.send(payload);
}

Kadira.send = function (payload) {
  var endpoint = Kadira.options.endpoint + '/errors';
  var retryCount = 0;
  var retry = new Retry({
    minCount: 1,
    minTimeout: 0,
    baseTimeout: 1000*5,
    maxTimeout: 1000*60,
  });
  tryToSend();

  function tryToSend() {
    if(retryCount < 5) {
      retry.retryLater(retryCount++, function () {
        $.ajax({url: endpoint, data: payload, error: tryToSend});
      });
    } else {
      console.warn('Error sending error traces to kadira server');
    }
  }
}

Kadira.prepareError = function (error) {
  if(error.stacks) {
    error.stacks.forEach(Kadira.prepareErrorStack);
  }
}

Kadira.prepareErrorStack = function (stack) {
  if(stack.ownerArgs) {
    stack.ownerArgs = stack.ownerArgs.map(Kadira.prepareArgument);
  }

  if(stack.events) {
    stack.events.forEach(function (event) {
      for(var key in event) {
        if(event.hasOwnProperty(key)) {
          event[key] = Kadira.prepareArgument(event[key]);
        }
      }
    });
  }

  if(stack.info) {
    stack.info.forEach(function (item) {
      for(var key in item) {
        if(item.hasOwnProperty(key)) {
          item[key] = Kadira.prepareArgument(item[key]);
        }
      }
    });
  }
}

Kadira.prepareArgument = function (value) {
  if(value && typeof value === 'function') {
    return '--- argument is a Function ---';
  }

  try {
    var string = JSON.stringify(value);
  } catch (e) {
    return '--- cannot stringify argument ---';
  }

  if(value && string.length > 1024) {
    return '--- argument size exceeds limit ---';
  }

  return value;
}
