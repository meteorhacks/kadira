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

MethodsModel.prototype.processMethod = function(methodTrace) {
  var dateId = this._getDateId(methodTrace.at);

  //append metrics to previous values
  this._appendMetrics(dateId, methodTrace);
  this._processMaxMin(methodTrace, methodTrace.metrics);

  if(methodTrace.errored) {
    this._handleErrors(dateId, methodTrace)
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

MethodsModel.prototype._appendMetrics = function(id, methodTrace) {
  //initialize meteric for this time interval
  if(!this.methodMetricsByMinute[id]) {
    this.methodMetricsByMinute[id] = {
      startTime: methodTrace.at,
      methods: {}
    };
  }

  var methods = this.methodMetricsByMinute[id].methods;

  //initialize method
  if(!methods[methodTrace.name]) {
    methods[methodTrace.name] = {
      count: 0,
      errors: 0
    };

    METHOD_METRICS_FIELDS.forEach(function(field) {
      methods[methodTrace.name][field] = 0;
    });
  }

  //merge
  METHOD_METRICS_FIELDS.forEach(function(field) {
    var value = methodTrace.metrics[field];
    if(value > 0) {
      methods[methodTrace.name][field] += value;
    }
  });

  methods[methodTrace.name].count++;
  this.methodMetricsByMinute[id].endTime = methodTrace.metrics.at;
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