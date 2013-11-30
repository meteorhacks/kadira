var METHOD_METRICS_FIELDS = ['wait', 'db', 'http', 'email', 'async', 'compute', 'total'];

MethodsModel = function (argument) {
  this.methodsStore = {};  
  this.maxResponseTimeRequests = {};
  this.minResponseTimeRequests = {};

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

MethodsModel.prototype.buildPayload = function(needMaxMin) {
  //these methods are not completed, so we don't delete them
  var methodsNotCompleted = {};

  var methodMetricsByMinute = {};
  var methodMetrics = [];

  var payload = {
    methodMetrics: [],
    methodRequests: []
  };

  for(var id in this.methodsStore) {
    var method = this.methodsStore[id];
    var singleMethodMetric = this._calculateSingleMethodMetrics(method);
    if(singleMethodMetric) {
      methodMetrics.push(singleMethodMetric);
      
      method.total = singleMethodMetric.total;
      //check min max response time
      if(!this.maxResponseTimeRequests[method.name]) {
        //add both to the max and min
        this.maxResponseTimeRequests[method.name] = method;
        this.minResponseTimeRequests[method.name] = method;
      } else if(this.maxResponseTimeRequests[method.name].total < method.total) {
        this.maxResponseTimeRequests[method.name] = method;
      } else if(this.minResponseTimeRequests[method.name].total > method.total) {
        this.minResponseTimeRequests[method.name] = method;
      }
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
      this.mergeMaxMin()
    );

    //reset maxMin
    this.maxResponseTimeRequests = {};
    this.minResponseTimeRequests = {};
  }

  //delete completed/errored methods
  this.methodsStore = _.extend({}, methodsNotCompleted);
  return payload;
};

MethodsModel.prototype.mergeMaxMin = function() {
  var idMap = {};
  var methods = [];

  loopAndPush(this.maxResponseTimeRequests, 'max');
  loopAndPush(this.minResponseTimeRequests, 'min');

  function loopAndPush(obj, type) {
    for(var methodName in obj) {
      var method = obj[methodName];
      if(!idMap[method._id]) {
        method.type = type;
        idMap[method._id] = true;
        methods.push(method);
      }
    }
  }

  return methods;
};

MethodsModel.prototype._calculateSingleMethodMetrics = function(method) {
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