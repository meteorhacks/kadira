
Kadira = {};
Kadira.options = __meteor_runtime_config__.kadira;

if(Kadira.options && Kadira.options.endpoint) {
  Kadira.syncedDate = new Ntp(Kadira.options.endpoint);
  Kadira.syncedDate.sync();
}

/**
 * Send error metrics/traces to kadira server
 * @param  {Object} payload Contains browser info and error traces
 */
Kadira.sendErrors = function (errors) {
  var retryCount = 0;
  var endpoint = Kadira.options.endpoint + '/errors';
  var retry = new Retry({
    minCount: 1,
    minTimeout: 0,
    baseTimeout: 1000*5,
    maxTimeout: 1000*60,
  });

  errors.forEach(function (error) {
    if(error.stacks) {
      error.stacks.forEach(function (stack) {

        // trim ownerArgs
        stack.ownerArgs = prepareArguments(stack.ownerArgs);

        // trim 'args' in each event
        if(stack.events) {
          stack.events = stack.events.filter(function (event) {
            // remove unnecessary events
            return true;
          }).map(function (event) {
            event.args = prepareArguments(event.args);
            return event;
          });
        }

        // trim 'document' in each info
        if(stack.info) {
          stack.info = stack.info.filter(function (item) {
            // remove unnecessary info
            return true;
          }).map(function (item) {
            if(item.document) {
              item.document = prepareArguments(item.document);
            }
            return item;
          });
        }

      });
    }
  });

  var payload = {
    errors: JSON.stringify(errors)
  };

  tryToSend();

  function tryToSend() {
    if(retryCount < 5) {
      retry.retryLater(retryCount++, sendPayload);
    } else {
      console.warn('Error sending error traces to kadira server');
    }
  }

  function sendPayload () {
    $.ajax({
      url: endpoint,
      data: payload,
      error: tryToSend
    });
  }

  function prepareArguments(args) {
    if(args) {
      return args.map(function (argument) {
        // replace if stringified argument is bigger than 1kb
        if(argument && JSON.stringify(argument).length > 1024) {
          return '--- argument size exceeds limit ---';
        } else {
          return argument;
        }
      });
    }
  }
}
