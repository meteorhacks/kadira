
ErrorModel = function (appId) {
  var self = this;
  this.appId = appId;
  this.errors = {};
  this.startTime = Date.now();
  this.maxErrors = 10;
}

_.extend(ErrorModel.prototype, KadiraModel.prototype);

ErrorModel.prototype.buildPayload = function() {
  var metrics = _.values(this.errors);
  this.startTime = Date.now();
  this.errors = {};
  return {errors: metrics};
};

ErrorModel.prototype.errorCount = function () {
  return _.values(this.errors).length;
};

ErrorModel.prototype.trackError = function(ex, trace) {
  var key = trace.type + ':' + ex.message;
  if(this.errors[key]) {
    this.errors[key].count++;
  } else if (this.errorCount() < this.maxErrors) {
    this.errors[key] = this._formatError(ex, trace);
  }
};

ErrorModel.prototype._formatError = function(ex, trace) {
  var time = Date.now();
  return {
    appId: this.appId,
    name: ex.message,
    type: trace.type,
    startTime: time,
    subType: trace.subType || trace.name,
    trace: trace,
    stacks: [{stack: ex.stack}],
    count: 1,
  }
};
