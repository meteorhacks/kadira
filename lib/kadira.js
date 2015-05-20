var request = Npm.require('request');
var hostname = Npm.require('os').hostname();
var logger = Npm.require('debug')('kadira:apm');
var Fibers = Npm.require('fibers');

Kadira.models = {};
Kadira.options = {};
Kadira.env = {
  currentSub: null, // keep current subscription inside ddp
  kadiraInfo: new Meteor.EnvironmentVariable(),
};
Kadira.waitTimeBuilder = new WaitTimeBuilder();
Kadira.errors = [];
Kadira.errors.addFilter = Kadira.errors.push.bind(Kadira.errors);

Kadira.connect = function(appId, appSecret, options) {
  options = options || {};
  options.appId = appId;
  options.appSecret = appSecret;
  options.payloadTimeout = options.payloadTimeout || 1000 * 20;
  options.endpoint = options.endpoint || "https://enginex.kadira.io";
  options.clientEngineSyncDelay = options.clientEngineSyncDelay || 10000;
  options.thresholds = options.thresholds || {};
  options.isHostNameSet = !!options.hostname;
  options.hostname = options.hostname || hostname;
  options.proxy = options.proxy || null;

  // remove trailing slash from endpoint url (if any)
  if(_.last(options.endpoint) === '/') {
    options.endpoint = options.endpoint.substr(0, options.endpoint.length - 1);
  }

  // error tracking is enabled by default
  if(options.enableErrorTracking === undefined) {
    options.enableErrorTracking = true;
  }

  Kadira.options = options;
  Kadira.options.authHeaders = {
    'KADIRA-APP-ID': Kadira.options.appId,
    'KADIRA-APP-SECRET': Kadira.options.appSecret
  };

  Kadira.syncedDate = new Ntp(options.endpoint);
  Kadira.syncedDate.sync();
  Kadira.models.methods = new MethodsModel(options.thresholds.methods);
  Kadira.models.pubsub = new PubsubModel();
  Kadira.models.system = new SystemModel();
  Kadira.models.error = new ErrorModel(appId);

  // handle pre-added filters
  var addFilterFn = Kadira.models.error.addFilter.bind(Kadira.models.error);
  Kadira.errors.forEach(addFilterFn);
  Kadira.errors = Kadira.models.error;

  // setting runtime info, which will be sent to kadira
  __meteor_runtime_config__.kadira = {
    appId: appId,
    endpoint: options.endpoint,
    clientEngineSyncDelay: options.clientEngineSyncDelay,
  };

  // send hostname to client only is users sets a custom hostname
  if(options.isHostNameSet) {
    __meteor_runtime_config__.kadira.hostname = options.hostname;
  }

  if(options.enableErrorTracking) {
    Kadira.enableErrorTracking();
  } else {
    Kadira.disableErrorTracking();
  }

  if(appId && appSecret) {
    options.appId = options.appId.trim();
    options.appSecret = options.appSecret.trim();
    Kadira._pingToCheckAuth(function(){
      // it takes time to calculate version 'sha' values
      // it'll be ready when Meteor.startup is called
      Meteor.startup(Kadira._sendAppStats);
      Kadira._schedulePayloadSend();
    });
    logger('connected to app: ', appId);
  } else {
    throw new Error('Kadira: required appId and appSecret');
  }

  // start tracking errors
  Meteor.startup(function () {
    TrackUncaughtExceptions();
    TrackMeteorDebug();
  })

  //start wrapping Meteor's internal methods
  Kadira._startInstrumenting(function() {
    console.log('Kadira: completed instrumenting the app')
    Kadira.connected = true;
  });

  Meteor.publish(null, function () {
    var options = __meteor_runtime_config__.kadira;
    this.added('kadira_settings', Random.id(), options);
    this.ready();
  });
};

//track how many times we've sent the data (once per minute)
Kadira._buildPayload = function () {
  var payload = {host: Kadira.options.hostname};
  var buildDetailedInfo = Kadira._isDetailedInfo();
  _.extend(payload, Kadira.models.methods.buildPayload(buildDetailedInfo));
  _.extend(payload, Kadira.models.pubsub.buildPayload(buildDetailedInfo));
  _.extend(payload, Kadira.models.system.buildPayload());
  if(Kadira.options.enableErrorTracking) {
    _.extend(payload, Kadira.models.error.buildPayload());
  }

  return payload;
}

Kadira._countDataSent = 0;
Kadira._detailInfoSentInterval = Math.ceil((1000*60) / Kadira.options.payloadTimeout);
Kadira._isDetailedInfo = function () {
  return (Kadira._countDataSent++ % Kadira._detailInfoSentInterval) == 0;
}

Kadira.authCheckFailures = 0;
Kadira._pingToCheckAuth = function (callback) {
  var httpOptions = {headers: Kadira.options.authHeaders, data: {}};
  var endpoint = Kadira.options.endpoint + '/ping';
  var authRetry = new Retry({
    minCount: 0, // don't do any immediate retries
    baseTimeout: 5 * 1000
  });

  Kadira._postData(endpoint, httpOptions, function(err, response){
    if(response) {
      if(response.statusCode == 200) {
        console.log('Kadira: successfully authenticated');
        authRetry.clear();
        callback();
      } else if(response.statusCode == 401) {
        console.error('Kadira: authentication failed - check your appId & appSecret')
      } else {
        retryPingToCheckAuth({message: "unidentified error code: " + response.statusCode});
      }
    } else {
      retryPingToCheckAuth(err);
    }
  });

  function retryPingToCheckAuth(err){
    console.log('Kadira: retrying to authenticate (error: %s)', err.message);
    authRetry.retryLater(Kadira.authCheckFailures, function(){
      Kadira._pingToCheckAuth(callback);
    });
  }
}

Kadira._sendAppStats = function () {
  var appStats = {};
  appStats.release = Meteor.release;
  appStats.kadiraVersion = '1.0.0';
  appStats.packageVersions = [];
  appStats.appVersions = {
    webapp: __meteor_runtime_config__['autoupdateVersion'],
    refreshable: __meteor_runtime_config__['autoupdateVersionRefreshable'],
    cordova: __meteor_runtime_config__['autoupdateVersionCordova']
  }

  // TODO get version number for installed packages
  _.each(Package, function (v, name) {
    appStats.packageVersions.push({name: name, version: null});
  });

  Kadira._send({
    host: Kadira.options.hostname,
    startTime: new Date(),
    appStats: appStats
  });
}

Kadira._schedulePayloadSend = function () {
  setTimeout(function () {
    Kadira._sendPayload(Kadira._schedulePayloadSend);
  }, Kadira.options.payloadTimeout);
}

Kadira._sendPayload = function (callback) {
  new Fibers(function() {
    var payload = Kadira._buildPayload();
    Kadira._send(payload, function (err) {
      if(err) {
        console.error('Kadira: Error sending payload (dropped after 5 tries)', err.message);
      }

      callback && callback();
    });
  }).run();
}

Kadira._send = function (payload, callback) {
  var endpoint = Kadira.options.endpoint;
  var httpOptions = {headers: Kadira.options.authHeaders, data: payload};
  var payloadRetries = 0;
  var payloadRetry = new Retry({
    minCount: 0, // don't do any immediate payloadRetries
    baseTimeout: 5*1000,
    maxTimeout: 60000
  });

  callHTTP();

  function callHTTP() {
    Kadira._postData(endpoint, httpOptions, function(err, response){
      if(response && response.statusCode === 401) {
        // do not retry if authentication fails
        throw new Error('Kadira: AppId, AppSecret combination is invalid');
      }

      if(response && response.statusCode == 200) {
        if(payloadRetries > 0) {
          logger('connected again and payload sent.')
        }
        cleaPayloadRetry();
        callback && callback();
      } else {
        if(!err) {
          err = new Error("Status code: " + response.statusCode);
        }
        tryAgain(err);
      }
    });
  }

  function tryAgain(err) {
    err = err || {};
    logger('retrying to send payload to server')
    if(++payloadRetries < 5) {
      payloadRetry.retryLater(payloadRetries, callHTTP);
    } else {
      cleaPayloadRetry();
      callback && callback(err);
    }
  }

  function cleaPayloadRetry() {
    payloadRetries = 0;
    payloadRetry.clear();
  }
}

// this return the __kadiraInfo from the current Fiber by default
// if called with 2nd argument as true, it will get the kadira info from
// Meteor.EnvironmentVariable
//
// WARNNING: returned info object is the reference object.
//  Changing it might cause issues when building traces. So use with care
Kadira._getInfo = function(currentFiber, useEnvironmentVariable) {
  currentFiber = currentFiber || Fibers.current;
  if(currentFiber) {
    if(useEnvironmentVariable) {
      return Kadira.env.kadiraInfo.get();
    }
    return currentFiber.__kadiraInfo;
  }
};

// this does not clone the info object. So, use with care
Kadira._setInfo = function(info) {
  Fibers.current.__kadiraInfo = info;
};

Kadira.enableErrorTracking = function () {
  __meteor_runtime_config__.kadira.enableErrorTracking = true;
  Kadira.options.enableErrorTracking = true;
};

Kadira.disableErrorTracking = function () {
  __meteor_runtime_config__.kadira.enableErrorTracking = false;
  Kadira.options.enableErrorTracking = false;
};

Kadira.trackError = function (type, message, options) {
  if(Kadira.options.enableErrorTracking && type && message) {
    options = options || {};
    options.subType = options.subType || 'server';
    options.stacks = options.stacks || '';
    var error = {message: message, stack: options.stacks};
    var trace = {
      type: type,
      subType: options.subType,
      name: message,
      errored: true,
      at: Kadira.syncedDate.getTime(),
      events: [['start', 0, {}], ['error', 0, {error: error}]],
      metrics: {total: 0}
    };
    Kadira.models.error.trackError(error, trace);
  }
}

Kadira.ignoreErrorTracking = function (err) {
  err._skipKadira = true;
}

Kadira._postData = function (endpoint, options, callback) {
  var content = JSON.stringify(options.data);

  var headers = options.headers;
  headers['Content-Type'] = 'application/json';

  var options = {
    url: endpoint,
    method: 'POST',
    encoding: 'utf8',
    body: content,
    headers: headers
  };

  if(Kadira.options.proxy) {
    options.proxy = Kadira.options.proxy;
  }

  request(options, function (error, res, body) {
    if(error) {
      console.error('Kadira:', error.message);
      return callback(error);
    }

    var response = {};
    response.statusCode = res.statusCode;
    callback(null, response);
  });
}
