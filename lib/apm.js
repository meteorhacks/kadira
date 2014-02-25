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

  //track how many times we've sent the data
  var countDataSent = 0;
  var detailInfoSentInterval = Math.ceil((1000 * 60) / options.payloadTimeout); //once per min

  if(appId && appSecret) {
    schedulePayloadSend();
    logger('connected to app: ', appId);
  } else {
    throw new Error('APM: AppId and AppSecret required!');
  }

  //start wrapping Meteor's internal methods
  Apm._startInstrumenting(function() {
    console.log('APM has completed intrumenting the app!')
    Apm.connected = true;
  });

  var retries = 0;

  function sendPayload() {
    var payload = buildPayload();
    var headers = {'APM-APP-ID': appId, 'APM-APP-SECRET': appSecret};
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
      } else {
        tryAgain();
      }
    }

    function tryAgain(err) {
      if(++retries < 5) {
        Meteor.setTimeout(callHTTP, 1000 * retries);
      } else {
        console.error('APM: Error sending payload(dropped after 5 tries) ', err.message);
        retries = 0;
        schedulePayloadSend();
      }
    }

  }
  
  function schedulePayloadSend() {
    Meteor.setTimeout(sendPayload, options.payloadTimeout); 
  }
  
  function buildPayload() {
    var payload = {host: hostname};
    var buildDetailedInfo = (countDataSent++ % detailInfoSentInterval) == 0;
    _.extend(payload, Apm.models.methods.buildPayload(buildDetailedInfo));
    _.extend(payload, Apm.models.pubsub.buildPayload(buildDetailedInfo));

    return payload;
  }
};

//this return the __apmInfo from the current Fiber. 
//WARNNING: this is not cloning the object, so it's writable; USE WITH CARE
Apm._getInfo = function() {
  if(Fibers.current) {
    return Fibers.current.__apmInfo;
  }
};

//this does not clone the info object. So, use with care
Apm._setInfo = function(info) {
  Fibers.current.__apmInfo = info;
};
