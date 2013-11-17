var http = Npm.require('http');
Apm = {};

Apm.connect = function(appId, appSecret, options) {
  options = options || {};

  var endpoint = options.endpoint || "http://localhost:11011";

  if(appId && appSecret) {
    schedulePayloadSend();
  } else {
    throw new Error('APM: AppId and AppSecret required!');
  }

  var retries = 0;

  function sendPayload() {
    var payload = {methods: _.values(MethodsStore)};
    MethodsStore = {};
    var headers = {'METEOR_APM_APPID': appId, 'METEOR_APM_SECRET': appSecret};
    var httpOptions = {headers: headers, data: payload};

    callHTTP();

    function callHTTP() {
      try {
        var response = HTTP.call('POST', endpoint, httpOptions);
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
    Meteor.setTimeout(sendPayload, 1000 * 10); 
  }
};
