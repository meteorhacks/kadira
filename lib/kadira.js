var http = Npm.require('http');
var hostname = Npm.require('os').hostname();
var logger = Npm.require('debug')('kadira:apm');
var Fibers = Npm.require('fibers');

Kadira = {};
Kadira.models = {};
Kadira.options = {};
Kadira.env = {
  currentSub: null, // keep current subscription inside ddp
  kadiraInfo: new Meteor.EnvironmentVariable(),
};

Kadira.connect = function(appId, appSecret, options) {
  options = options || {};
  options.appId = appId;
  options.payloadTimeout = options.payloadTimeout || 1000 * 20;
  options.endpoint = options.endpoint || "https://engine.kadira.io";
  options.thresholds = options.thresholds || {};

  // remove trailing slash from endpoint url (if any)
  if(_.last(options.endpoint) === '/') {
    options.endpoint = options.endpoint.substr(0, options.endpoint.length - 1);
  }

  Kadira.options = options;
  Kadira.syncedDate = new Ntp(options.endpoint);
  Kadira.syncedDate.sync();
  Kadira.models.methods = new MethodsModel(options.thresholds.methods);
  Kadira.models.pubsub = new PubsubModel();
  Kadira.models.system = new SystemModel();
  Kadira.models.error = new ErrorModel(appId);
  Kadira.sendPayload = sendPayload;

  // setting runtime info, which will be sent to kadira
  __meteor_runtime_config__.kadira = {
    appId: appId,
    endpoint: options.endpoint
  };

  if(canTrackErrors()) {
    Kadira.enableErrorTracking();
  } else {
    Kadira.disableErrorTracking();
  }

  //track how many times we've sent the data
  var countDataSent = 0;
  var detailInfoSentInterval = Math.ceil((1000 * 60) / options.payloadTimeout); //once per min

  if(appId && appSecret) {
    appId = appId.trim();
    appSecret = appSecret.trim();

    pingToCheckAuth(function(){
      schedulePayloadSend();
    });
    logger('connected to app: ', appId);
  } else {
    throw new Error('Kadira: required appId and appSecret');
  }

  //start wrapping Meteor's internal methods
  Kadira._startInstrumenting(function() {
    console.log('Kadira: completed instrumenting the app')
    Kadira.connected = true;
  });

  var payloadRetries = 0;
  var payloadRetry = new Retry({
      minCount: 0, // don't do any immediate payloadRetries
      baseTimeout: 5*1000,
      maxTimeout: 60000
  });

  function sendPayload(callback) {

    callHTTP();

    function callHTTP() {
      new Fibers(function() {
        var payload = buildPayload();
        var headers = buildHeaders();
        var httpOptions = {headers: headers, data: payload};

        try {
          var response = HTTP.call('POST', options.endpoint, httpOptions);
          processResponse(response);
        } catch(err) {
          tryAgain(err);
        }
      }).run();
    }

    function processResponse(response) {
      if(response.statusCode == '401') {
        throw new Error('Kadira: AppId, AppSecret combination is invalid');
      } else if(response.statusCode == '200') {
        //success send again in 10 secs
        schedulePayloadSend();
        if(payloadRetries > 0) {
          logger('connected again and payload sent.')
        }
        cleaPayloadRetry();
        callback && callback();
      } else {
        tryAgain();
      }
    }

    function tryAgain(err) {
      err = err || {};
      logger('retrying to send payload to server')
      if(++payloadRetries < 5) {
        payloadRetry.retryLater(payloadRetries, callHTTP);
      } else {
        console.error('Kadira: Error sending payload(dropped after 5 tries) ', err.message);
        cleaPayloadRetry();
        schedulePayloadSend();
      }
    }

  }

  function cleaPayloadRetry() {
    payloadRetries = 0;
    payloadRetry.clear();
  }

  function buildHeaders(){
    return {'APM-APP-ID': appId, 'APM-APP-SECRET': appSecret}
  }

  function schedulePayloadSend() {
    setTimeout(sendPayload, options.payloadTimeout);
  }

  function canTrackErrors () {
    if(Kadira.options.enableErrorTracking === undefined) {
      return true;
    } else {
      return Kadira.options.enableErrorTracking;
    }
  }


  var authCheckFailures = 0;
  function pingToCheckAuth(callback){
    var httpOptions = {headers: buildHeaders(), data: {}};
    var endpoint = options.endpoint + '/ping'

    new Fibers(function() {
      HTTP.call('POST', endpoint, httpOptions, function(err, response){
        if(response) {
          if(response.statusCode == 200) {
            console.log('Kadira: successfully authenticated');
            authRetry.clear();
            callback();
          } else if(response.statusCode == 401) {
            console.error('Kadira: authenticatation failed - check your appId & appSecret')
          } else {
            retryPingToCheckAuth(callback);
          }
        } else {
          retryPingToCheckAuth();
        }
      });
    }).run();

    var authRetry = new Retry({
      minCount: 0, // don't do any immediate retries
      baseTimeout: 5*1000 // start with 30s
    });

    function retryPingToCheckAuth(){
      console.log('Kadira: retrying to authenticate');
      authRetry.retryLater(authCheckFailures, function(){
        pingToCheckAuth(callback)
      });
    }
  }

  function buildPayload() {
    var payload = {host: hostname};
    var buildDetailedInfo = (countDataSent++ % detailInfoSentInterval) == 0;
    _.extend(payload, Kadira.models.methods.buildPayload(buildDetailedInfo));
    _.extend(payload, Kadira.models.pubsub.buildPayload(buildDetailedInfo));
    _.extend(payload, Kadira.models.system.buildPayload());
    if(options.enableErrorTracking) {
      _.extend(payload, Kadira.models.error.buildPayload());
    }

    return payload;
  }
};

// this return the __kadiraInfo from the current Fiber by default
// if called with 2nd argument as true, it will get the kadira info from
// Meteor.EnvironmentVariable
//
// WARNNING: retunred info object is the reference object.
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
  var kadiraInfo = Kadira.env.kadiraInfo.get();
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
