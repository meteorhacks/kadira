var http = Npm.require('http');
var hostname = Npm.require('os').hostname();
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
    var payload = buildPayload();
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

/************************** PAYLOAD BUILDING ************************/

function buildPayload() {
  var payload = {host: hostname};
  buildMethodMetrics(payload);

  return payload;
}

function buildMethodMetrics(payload) {
  var METHOD_METRICS_FIELDS = ['db', 'http', 'email', 'async', 'compute', 'total', 'errors'];

  //these methods are not completed, so we don't delete them
  var methodsNotCompleted = {};

  var methodMetricsByMinute = {};
  var methodMetrics = [];

  payload.methodMetrics = [];
  payload.methodRequests = [];

  for(var id in MethodsStore) {
    var method = MethodsStore[id];
    var singleMethodMetric = calculateSingleMethodMetrics(method);
    if(singleMethodMetric) {
      methodMetrics.push(singleMethodMetric);
    } else {
      //this method is not completed, so save it
      methodsNotCompleted[id] = method;
    }
  }

  for(var lc=0; lc<methodMetrics.length; lc++) {
    var methodMetric = methodMetrics[lc];
    var atDate = new Date(methodMetric.at);
    var id = atDate.getHours() + ':' + atDate.getMinutes();

    //initialize meteric for this time interval
    if(!methodMetricsByMinute[id]) {
      methodMetricsByMinute[id] = {
        startTime: methodMetric.at,
        methods: {}
      };
    }

    //initialize method
    if(!methodMetricsByMinute[id].methods[methodMetric.name]) {
      methodMetricsByMinute[id].methods[methodMetric.name] = {
        count: 0,
        errors: 0
      };

      METHOD_METRICS_FIELDS.forEach(function(field) {
        methodMetricsByMinute[id].methods[methodMetric.name][field] = 0;
      });
    }

    //merge
    METHOD_METRICS_FIELDS.forEach(function(field) {
      var value = methodMetric[field];
      if(value > 0) {
        methodMetricsByMinute[id].methods[methodMetric.name][field] += value;
      }
    });

    //methods with errors
    if(methodMetric.errored) {
      methodMetricsByMinute[id].methods[methodMetric.name].errors ++

      //sending error requests as it is
      var methodRequest = MethodsStore[methodMetric._id];
      methodRequest.type = 'error';
      payload.methodRequests.push(methodRequest);
    }

    methodMetricsByMinute[id].methods[methodMetric.name].count ++;
    methodMetricsByMinute[id].endTime = methodMetric.at;
  }

  //create final paylod for methodMetrics
  for(var key in methodMetricsByMinute) {
    for(var methodName in methodMetricsByMinute[key].methods) {
      METHOD_METRICS_FIELDS.forEach(function(field) {
        methodMetricsByMinute[key].methods[methodName][field] /= methodMetricsByMinute[key].methods[methodName].count;
      });
    }

    payload.methodMetrics.push(methodMetricsByMinute[key]);
  }

  //delete completed/errored methods
  MethodsStore = _.extend({}, methodsNotCompleted);
}

function calculateSingleMethodMetrics(method) {
  var firstEvent = method.events[0];
  var lastEvent = method.events[method.events.length - 1];

  if(firstEvent.type != 'start') {
    return null;
  } else if(lastEvent.type != 'complete' && lastEvent.type != 'error') {
    //method is not completed or errored yet
    return null;
  } else {
    //build the metrics
    var metrics = {
      _id: method._id,
      name: method.name,
      at: firstEvent.at,
      total: lastEvent.at - firstEvent.at,
      errored: lastEvent.type == 'error'
    };
    var totalNonCompute = 0;

    for(var lc=1; lc < method.events.length - 1; lc += 2) {
      var startEvent = method.events[lc];
      var endEvent = method.events[lc+1];
      if(!endEvent) {
        console.log('no end event for type: ', startEvent.type);
      } else if(endEvent.type != startEvent.type + 'end') {
        console.log('endevent type mismatch: ', startEvent.type, endEvent.type);
      } else {
        metrics[startEvent.type] = endEvent.at - startEvent.at;
        totalNonCompute += metrics[startEvent.type];
      }
    }

    metrics.compute = metrics.total - totalNonCompute;
    return metrics;
  }
}
