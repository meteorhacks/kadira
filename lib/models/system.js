var SYSTEM_METRICS_FIELDS = ['testfield'];

SystemModel = function () {
  var self = this;

  this.metrics = {};
  this.resetMetrics();
}

_.extend(SystemModel.prototype, ApmModel.prototype);

SystemModel.prototype.setSessionsCount = function(count) {
  this.metrics.sessions = count;
};

SystemModel.prototype.buildPayload = function() {
  var metrics = this.metrics;
  this.resetMetrics();
  metrics.rssBytes = process.memoryUsage().rss;
  return {systemMetrics: metrics};
};

SystemModel.prototype.resetMetrics = function() {
  // this.metrics.sessions = 0;
  this.metrics.rssBytes = 0;
  this.metrics.loadAverage = 0;
  this.metrics.eventLoopTime = 0;
  this.metrics.eventLoopCount = 0;
  this.metrics.totalTime = 0;
};
