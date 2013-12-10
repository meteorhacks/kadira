var METHOD_METRICS_FIELDS = ['wait', 'db', 'http', 'email', 'async', 'compute', 'total'];

MethodsModel = function (argument) {
  var self = this;
  this.methodsStore = {};  

  //store max time elapsed methods for each method, event(metrics-field)
  this.maxEventTimesForMethods = {};

  //eg:- forEach <sendMaxMinInterval>th interval maxmin will be sent.
  this.sendMaxMinInterval = 3;
  this._countPayloads = 0;
};

MethodsModel.prototype.getMethod = function(apmInfo) {
  var id = apmInfo.session + "::" + apmInfo.method.id;

  //initialize method if not exists
  if(!this.methodsStore[id]) {
    this.methodsStore[id] = {
      _id: id,
      name: apmInfo.method.name,
      session: apmInfo.session,
      methodId: apmInfo.method.id,
      events: []
    };
  }
  
  return this.methodsStore[id];
};

/*
  There are two types of data

  1. methodMetrics - metrics about the methods (for every 10 secs)
  2. methodRequests - raw method request. normally max, min for every 1 min and errors always
*/
MethodsModel.prototype.buildPayload = function() {
  //these methods are not completed, so we don't delete them
  var methodsNotCompleted = {};
  var methodMetricsByMinute = {};
  var metricsOfCompletedMethods = [];

  var payload = {
    methodMetrics: [],
    methodRequests: []
  };

  //computing metrics
  for(var id in this.methodsStore) {
    var method = this.methodsStore[id];
    var methodMetric = this._computeMetricsOfCompletedMethods(method);
    if(methodMetric) {
      metricsOfCompletedMethods.push(methodMetric);
      method.total = methodMetric.total;
      this._processMaxMin(methodMetric);
    } else {
      //this method is not completed, so save it
      methodsNotCompleted[id] = method;
    }
  }

  //aggregate metrics into minutes
  for(var lc=0; lc<metricsOfCompletedMethods.length; lc++) {
    var methodMetric = metricsOfCompletedMethods[lc];
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
      var methodRequest = this.methodsStore[methodMetric._id];
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

  //handling needMaxMin
  if((++this._countPayloads % this.sendMaxMinInterval) == 0) {
    payload.methodRequests = _.union(
      payload.methodRequests,
      this._mergeMaxMin()
    );
  }

  //delete completed/errored methods
  this.methodsStore = _.extend({}, methodsNotCompleted);
  return payload;
};

/*
  calculate if the given method is a max min for a given metricsField (AKA: event)
  currently only MAX is calculated, MIN will be process if needed in future
*/
MethodsModel.prototype._processMaxMin = function(method) {
  for(var lc=0; lc<METHOD_METRICS_FIELDS.length; lc++) {
    var field = METHOD_METRICS_FIELDS[lc];

    if(this.maxEventTimesForMethods[method.name] === undefined) {
      this.maxEventTimesForMethods[method.name] = {};
    }

    // break;
    var maxEventMethodMap = this.maxEventTimesForMethods[method.name];

    if(!maxEventMethodMap[field]) {
      method[field] = method[field] || 0;
      updateFields(method);
      maxEventMethodMap[field] = method;
    } else if(maxEventMethodMap[field][field] < method[field]){
      updateFields(method);
      maxEventMethodMap[field] = method;
    }
  }

  function updateFields(method) {
    method.type = 'max';
    method.event = field;
  }
};

MethodsModel.prototype._mergeMaxMin = function() {
  var idMap = {};
  var methods = [];

  for(var method in this.maxEventTimesForMethods) {
    var maxEventMethodMap = this.maxEventTimesForMethods[method];
    for(var event in maxEventMethodMap) {
      var method = maxEventMethodMap[event];
      if(!idMap[method._id]) {
        idMap[method._id] = true;
        methods.push(method);
      }
    }
  }

  //reset maxMin
  this.maxEventTimesForMethods = {};

  return methods;
};

MethodsModel.prototype._computeMetricsOfCompletedMethods = function(method) {
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
};