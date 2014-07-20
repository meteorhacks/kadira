
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

ErrorModel.prototype.trackError = function(ex, source) {
  if(this.errors[ex.message]) {
    this.errors[ex.message].count++;
  } else {
    this.errors[ex.message] = this._formatError(ex, source);
  }
};

ErrorModel.prototype._formatError = function(ex, source) {
  var now = Date.now();
  return {
    appId : this.appId,
    name : ex.message,
    source : source,
    startTime : now,
    type : 'server',
    stack : [{at: now, events: [], stack: ex.stack}],
    count: 1,
  }
};
