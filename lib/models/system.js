var os = Npm.require('os');
var uvmon = Npm.require('nodefly-uvmon');

SystemModel = function () {
  var self = this;
  this.lastGetData = Date.now();
  // need to call this here and clean the older data
  uvmon.getData();
}

_.extend(SystemModel.prototype, ApmModel.prototype);

SystemModel.prototype.getEventLoopData = function() {
  var data = uvmon.getData();
  var time = Date.now();
  data.time = time - this.lastGetData;
  this.lastGetData = time;
  return data;
};

SystemModel.prototype.buildPayload = function() {
  var metrics = {};
  metrics.startTime = this.lastGetData;
  var uvData = this.getEventLoopData();
  metrics.endTime = this.lastGetData;
  metrics.sessions = _.keys(Meteor.default_server.sessions).length;
  metrics.rssBytes = process.memoryUsage().rss;
  metrics.loadAverage = os.loadavg()[0];
  metrics.eventLoopTime = uvData.sum_ms;
  metrics.eventLoopCount = uvData.count;
  metrics.totalTime = uvData.time;
  return {systemMetrics: [metrics]};
};
