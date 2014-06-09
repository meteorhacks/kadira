var os = Npm.require('os');

SystemModel = function () {
  var self = this;
  this.startTime = Date.now();
  try {
    var usage = Npm.require('usage');
    this.usageLookup = Meteor._wrapAsync(usage.lookup.bind(usage));
  } catch(ex) {
    console.error('Kadira: usage npm module loading failed - ', ex.message);
  }
}

_.extend(SystemModel.prototype, KadiraModel.prototype);

SystemModel.prototype.buildPayload = function() {
  var metrics = {};
  var now = Date.now();
  metrics.startTime = Kadira.syncedDate.syncTime(this.startTime);
  metrics.endTime = Kadira.syncedDate.syncTime(now);

  metrics.sessions = _.keys(Meteor.default_server.sessions).length;
  metrics.memory = process.memoryUsage().rss / (1024*1024);

  if(this.usageLookup) {
    metrics.cpu = this.usageLookup(process.pid, {keepHistory: true}).cpu;
  }

  this.startTime = now;
  return {systemMetrics: [metrics]};
};
