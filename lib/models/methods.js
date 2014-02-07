var METHOD_METRICS_FIELDS = ['wait', 'db', 'http', 'email', 'async', 'compute', 'total'];

MethodsModel = function (metricsThreshold) {
  var self = this;
  
  this.methodMetricsByMinute = {};
  this.errorMap = {};

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
};

_.extend(MethodsModel.prototype, ApmModel.prototype);

MethodsModel.prototype.processMethod = function(method) {
  var metrics = this._computeMetricsOfCompletedMethods(method);
  method.metrics = _.pick(metrics, METHOD_METRICS_FIELDS);

  var dateId = this._getDateId(metrics.at);

  //append metrics to previous values
  this._appendMetrics(dateId, metrics);
  this._processMaxMin(method, metrics);

  if(metrics.errored) {
    this._handleErrors(dateId, method)
  }
};

MethodsModel.prototype._handleErrors = function(id, method) {
  this.methodMetricsByMinute[id].methods[method.name].errors ++

  //sending error requests as it is
  var error = method.events[method.events.length -1].data.error;

  //check if there is a previous error which has the same error messages 
  //and happens in the same methods
  var errorKey = method.name + "::" + error.message;
  if(this.errorMap[errorKey]) {
    this.errorMap[errorKey].errorCount ++;
  } else {
    var erroredMethodRequest = this._cloneMethod(method);
    erroredMethodRequest.type = 'error';
    delete erroredMethodRequest.maxMetric;

    erroredMethodRequest.errorCount = 1;
    this.errorMap[errorKey] = erroredMethodRequest;
  }
};

MethodsModel.prototype._appendMetrics = function(id, metrics) {
  //initialize meteric for this time interval
  if(!this.methodMetricsByMinute[id]) {
    this.methodMetricsByMinute[id] = {
      startTime: metrics.at,
      methods: {}
    };
  }

  var methods = this.methodMetricsByMinute[id].methods;

  //initialize method
  if(!methods[metrics.name]) {
    methods[metrics.name] = {
      count: 0,
      errors: 0
    };

    METHOD_METRICS_FIELDS.forEach(function(field) {
      methods[metrics.name][field] = 0;
    });
  }

  //merge
  METHOD_METRICS_FIELDS.forEach(function(field) {
    var value = metrics[field];
    if(value > 0) {
      methods[metrics.name][field] += value;
    }
  });

  methods[metrics.name].count++;
  this.methodMetricsByMinute[id].endTime = metrics.at;
};

/*
  There are two types of data

  1. methodMetrics - metrics about the methods (for every 10 secs)
  2. methodRequests - raw method request. normally max, min for every 1 min and errors always
*/
MethodsModel.prototype.buildPayload = function(buildDetailedInfo) {
  var payload = {
    methodMetrics: [],
    methodRequests: []
  };

  //handling metrics
  var methodMetricsByMinute = this.methodMetricsByMinute;
  this.methodMetricsByMinute = {};

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
  if(buildDetailedInfo) {
    payload.methodRequests = _.union(
      payload.methodRequests,
      this._mergeMaxMin()
    );
  }

  //add errors
  for(var key in this.errorMap) {
    payload.methodRequests.push(this.errorMap[key]);
  }
  this.errorMap = {};

  // console.log(payload);
  return payload;
};

/*
  calculate if the given method is a max min for a given metricsField (AKA: event)
  currently only MAX is calculated, MIN will be process if needed in future
*/
MethodsModel.prototype._processMaxMin = function(method, methodMetric) {
  var self = this;
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
    return self._cloneMethod(method);
  }
};

MethodsModel.prototype._cloneMethod = function(method) {
  method = EJSON.clone(method);
  method._id = method.session + "::" + method.id;
  method.methodId = method.id;
  delete method.id;

  return method;
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

  // console.log(method.events);

  if(firstEvent.type != 'start') {
    return null;
  } else if(lastEvent.type != 'complete' && lastEvent.type != 'error') {
    //method is not completed or errored yet
    return null;
  } else {
    //build the metrics
    var metrics = {
      id: method.id,
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
        console.error('apm: no end event for type: ', startEvent.type);
      } else if(endEvent.type != startEvent.type + 'end') {
        console.error('apm: endevent type mismatch: ', startEvent.type, endEvent.type, JSON.stringify(method));
      } else {
        var elapsedTimeForEvent = endEvent.at - startEvent.at
        metrics[startEvent.type] = metrics[startEvent.type] || 0;
        metrics[startEvent.type] += elapsedTimeForEvent;
        totalNonCompute += elapsedTimeForEvent;
      }
    }

    metrics.compute = metrics.total - totalNonCompute;
    return metrics;
  }
};