KadiraErrorModel = function(options) {
  options = options || {};
  options.maxErrorsPerInterval = options.maxErrorsPerInterval || 10;
  options.intervalInMillis = options.intervalInMillis || 1000 * 60 *2; //2 mins
  var self = this;

  self.options = options;

  // errorsSentCount will be reseted at the start of the interval
  self.errorsSentCount = 0;
  self.errorsSent = {};
  self.intervalTimeoutHandler = setInterval(function() {
    self.errorsSentCount = 0;
    self._flushErrors();
  }, self.options.intervalInMillis);
};

KadiraErrorModel.prototype.sendError = function(error) {
  var self = this;
  if(!self.errorsSent[error.name]) {
    error.count = 1;
    Kadira.send({errors: [error]});
    
    self.errorsSent[error.name] = _.clone(error);
    self.errorsSent[error.name].count = 0;
    self.errorsSentCount++;
  } else {
    self.increamentErrorCount(error.name);
  }
};

KadiraErrorModel.prototype._flushErrors = function() {
  var self = this;
  var errors = _.values(self.errorsSent);
  errors = _.filter(errors, function(error) {
    return error.count > 0;
  });
  Kadira.send({errors: errors});
  self.errorsSent = {};
};

KadiraErrorModel.prototype.isErrorExists = function(name) {
  return !!this.errorsSent[name];
};

KadiraErrorModel.prototype.increamentErrorCount = function(name) {
  var error = this.errorsSent[name];
  if(error) {
    error.count++;
  }
};

KadiraErrorModel.prototype.canSendErrors = function() {
  return this.errorsSentCount < this.options.maxErrorsPerInterval;
};

KadiraErrorModel.prototype.close = function() {
  clearTimeout(this.intervalTimeoutHandler);
};