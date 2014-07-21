
ErrorModel = function (appId) {
  var self = this;
  this.appId = appId;
  this.errors = {};
  this.startTime = Date.now();
}

_.extend(ErrorModel.prototype, KadiraModel.prototype);

ErrorModel.prototype.buildPayload = function() {
  var metrics = _.values(this.errors);
  this.startTime = Date.now();
  this.errors = {};
  return {errors: metrics};
};

ErrorModel.prototype.trackError = function(ex, trace) {
  var key = trace.type + ':' + ex.message;
  if(this.errors[key]) {
    this.errors[key].count++;
  } else {
    this.errors[key] = this._formatError(ex, trace);
  }
};

ErrorModel.prototype._formatError = function(ex, trace) {
  var source = trace.type + ':' + trace.name;
  return {
    appId : this.appId,
    name : ex.message,
    source : source,
    startTime : trace.at,
    type : 'server',
    trace: trace,
    stack : [{stack: ex.stack}],
    count: 1,
  }
};
