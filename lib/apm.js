var http = Npm.require('http');
var hostname = Npm.require('os').hostname();
var logger = Npm.require('debug')('apm:apm');
var Fibers = Npm.require('fibers');

Apm = {};
Apm.models = {};
Apm.env = {
  currentSub: new Meteor.EnvironmentVariable()
};

Apm.connect = function(appId, appSecret, options) {
  options = options || {};
  options.payloadTimeout = options.payloadTimeout || 1000 * 10;
  options.endpoint = options.endpoint || "https://engine.meteorapm.com";
  options.thresholds = options.thresholds || {};

  Apm.syncedDate = new Ntp("http://ntp.meteorapm.com");
  Apm.syncedDate.sync();
  Apm.models.methods = new MethodsModel(options.thresholds.methods);
  Apm.models.pubsub = new PubsubModel();
  Apm.models.system = new SystemModel();

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
    throw new Error('APM: required appId and appSecret');
  }

  //start wrapping Meteor's internal methods
  Apm._startInstrumenting(function() {
    console.log('APM: completed instrumenting the app')
    Apm.connected = true;
  });

  var payloadRetries = 0;
  var payloadRetry = new Retry({
      minCount: 0, // don't do any immediate payloadRetries
      baseTimeout: 5*1000,
      maxTimeout: 60000
  });

  function sendPayload() {
    var payload = buildPayload();
    var headers = buildHeaders();
    var httpOptions = {headers: headers, data: payload};

    callHTTP();

    function callHTTP() {
      try {
        var response = HTTP.call('POST', options.endpoint, httpOptions);
        processResponse(response);
      } catch(err) {
        tryAgain(err);
      }
    }

    function processResponse(response) {
      if(response.statusCode == '401') {
        throw new Error('APM: AppId, AppSecret combination is invalid');
      } else if(response.statusCode == '200') {
        //success send again in 10 secs
        schedulePayloadSend();
        if(payloadRetries > 0) {
          console.log('APM: connected again and payload sent.')
        }
        cleaPayloadRetry();
      } else {
        tryAgain();
      }
    }

    function tryAgain(err) {
      err = err || {};
      console.log('APM: retrying to send payload to server')
      if(++payloadRetries < 5) {
        payloadRetry.retryLater(payloadRetries, callHTTP);
      } else {
        console.error('APM: Error sending payload(dropped after 5 tries) ', err.message);
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
    Meteor.setTimeout(sendPayload, options.payloadTimeout);
  }

  var authCheckFailures = 0;
  function pingToCheckAuth(callback){
    var httpOptions = {headers: buildHeaders(), data: {}};
    var endpoint = options.endpoint + '/ping'

    var response = HTTP.call('POST', endpoint, httpOptions, function(err, response){
      if(response) {
        if(response.statusCode == 200) {
          console.log('APM: successfully authenticated');
          authRetry.clear();
          callback();
        } else if(response.statusCode == 401) {
          console.error('APM: authenticatation failed - check your appId & appSecret')
        } else {
          retryPingToCheckAuth(callback);
        }
      } else {
        retryPingToCheckAuth();
      }

    });

    var authRetry = new Retry({
      minCount: 0, // don't do any immediate retries
      baseTimeout: 5*1000 // start with 30s
    });

    function retryPingToCheckAuth(){
      console.log('APM: retrying to authenticate');
      authRetry.retryLater(authCheckFailures, function(){
        pingToCheckAuth(callback)
      });
    }

  }

  function buildPayload() {
    var payload = {host: hostname};
    var buildDetailedInfo = (countDataSent++ % detailInfoSentInterval) == 0;
    _.extend(payload, Apm.models.methods.buildPayload(buildDetailedInfo));
    _.extend(payload, Apm.models.pubsub.buildPayload(buildDetailedInfo));
    _.extend(payload, Apm.models.system.buildPayload());

    return payload;
  }
};

//this return the __apmInfo from the current Fiber.
//WARNNING: this is not cloning the object, so it's writable; USE WITH CARE
Apm._getInfo = function(currentFiber) {
  currentFiber = currentFiber || Fibers.current;
  if(currentFiber) {
    return currentFiber.__apmInfo;
  }
};

//this does not clone the info object. So, use with care
Apm._setInfo = function(info) {
  Fibers.current.__apmInfo = info;
};
