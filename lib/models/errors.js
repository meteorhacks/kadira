
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
  var name = ex.name + ': ' + ex.message;
  if(this.errors[name]) {
    this.errors[name].count++;
  } else {
    this.errors[name] = this._formatError(ex, source);
  }
};

ErrorModel.prototype._formatError = function(ex, source) {
  var name = ex.name + ': ' + ex.message;
  var now = Date.now();
  return {
    appId : this.appId,
    name : name,
    source : source,
    startTime : now,
    type : 'server',
    stack : [{at: now, events: [], stack: ex.stack}],
    count: 1,
  }
};
