var METHOD_METRICS_FIELDS = ['wait', 'db', 'http', 'email', 'async', 'compute', 'total'];

MethodsModel = function (metricsThreshold) {
  var self = this;
  this.methodsStore = {};  
  this._metricsThreshold = _.extend({
    "wait": 100, 
    "db": 100, 
    "http": 1000,
    "email": 100,
    "async": 100, 
    "compute": 100, 
    "total": 200
  }, metricsThreshold || {});


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
  //used prevent same error being reported multiple times. 
  //used <method>::<error message> as the key
  var errorMap = {};

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
      method.metrics = _.pick(methodMetric, METHOD_METRICS_FIELDS);
      this._processMaxMin(method, methodMetric);
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
      var error = methodRequest.events[methodRequest.events.length -1].data.error;

      //check if there is a previous error which has the same error messages 
      //and happens in the same methods
      var errorKey = methodRequest.name + "::" + error.message;
      if(errorMap[errorKey]) {
        errorMap[errorKey].errorCount ++;
      } else {
        var erroredMethodRequest = EJSON.clone(methodRequest);
        erroredMethodRequest.type = 'error';
        delete erroredMethodRequest.maxMetric;
        erroredMethodRequest.errorCount = 1;
        errorMap[errorKey] = erroredMethodRequest;
        payload.methodRequests.push(erroredMethodRequest);
      }
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
MethodsModel.prototype._processMaxMin = function(method, methodMetric) {
  for(var lc=0; lc<METHOD_METRICS_FIELDS.length; lc++) {
    var field = METHOD_METRICS_FIELDS[lc];
    // console.log('field', field);

    //set metric to 0 if not initialized before
    method.metrics[field] = method.metrics[field] || 0;

    if(this.maxEventTimesForMethods[method.name] === undefined) {
      this.maxEventTimesForMethods[method.name] = {};
    }

    // break;
    var maxEventMethodMap = this.maxEventTimesForMethods[method.name];

    if(method.metrics[field] < this._metricsThreshold[field]) {
      //if the value is lower than the threshold
      continue;
    } else if(!maxEventMethodMap[field]) {
      maxEventMethodMap[field] = cloneAndAssign(method, field);
    } else if(maxEventMethodMap[field].metrics[field] < method.metrics[field]){
      maxEventMethodMap[field] = cloneAndAssign(method, field);
    }
  }

  function cloneAndAssign(method, field) {
    method.type = 'max';
    //where is max is for
    method.maxMetric = field;
    return EJSON.clone(method);
  }
};

MethodsModel.prototype._mergeMaxMin = function() {
  var idMap = {};
  var methods = [];

  for(var method in this.maxEventTimesForMethods) {
    var maxEventMethodMap = this.maxEventTimesForMethods[method];
    for(var event in maxEventMethodMap) {
      var method = maxEventMethodMap[event];
      methods.push(method);
      //we need to send all
      // if(!idMap[method._id]) {
      //   idMap[method._id] = true;
      // }
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
        console.log('===', JSON.stringify(method));
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