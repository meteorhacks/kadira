var http = Npm.require('http');
var hostname = Npm.require('os').hostname();
Apm = {};
Apm.models = {};
Apm.models.methods = new MethodsModel();

Apm.connect = function(appId, appSecret, options) {
  options = options || {};
  options.payloadTimeout = options.payloadTimeout || 1000 * 10;
  options.endpoint = options.endpoint || "http://localhost:11011";

  //set sendMaxMinInterval accordingly (need to send one per minute)
  Apm.models.methods.sendMaxMinInterval = Math.ceil((1000 * 60) / options.payloadTimeout);

  if(appId && appSecret) {
    schedulePayloadSend();
  } else {
    throw new Error('APM: AppId and AppSecret required!');
  }

  var retries = 0;

  function sendPayload() {
    var payload = buildPayload();
    var headers = {'METEOR_APM_APPID': appId, 'METEOR_APM_SECRET': appSecret};
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
};

function buildPayload() {
  var payload = {host: hostname};
  _.extend(payload, Apm.models.methods.buildPayload());

  return payload;
}