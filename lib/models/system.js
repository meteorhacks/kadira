var os = Npm.require('os');
var uvmon = Npm.require('nodefly-uvmon');

SystemModel = function () {
  var self = this;
  this.lastGetData = (new Date).getTime();
  // need to call this here and clean the older data
  uvmon.getData();
}

_.extend(SystemModel.prototype, KadiraModel.prototype);

SystemModel.prototype.getEventLoopData = function() {
  var data = uvmon.getData();
  var time = (new Date).getTime();
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
  metrics.memory = process.memoryUsage().rss / (1024*1024);
  metrics.loadAverage = os.loadavg()[0];
  metrics.eventLoopTime = uvData.sum_ms;
  metrics.eventLoopCount = uvData.count;
  metrics.totalTime = uvData.time;
  return {systemMetrics: [metrics]};
};
