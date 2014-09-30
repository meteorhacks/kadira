var os = Npm.require('os');

SystemModel = function () {
  var self = this;
  this.startTime = Ntp._now();
  this.newSessions = 0;
  try {
    var usage = (typeof KadiraBinaryDeps != 'undefined')?
      KadiraBinaryDeps.usage: Npm.require('usage');
    this.usageLookup = Meteor._wrapAsync(usage.lookup.bind(usage));
  } catch(ex) {
    console.error('Kadira: usage npm module loading failed - ', ex.message);
  }

  Meteor.onConnection(function () {
    self.newSessions++;
  });
}

_.extend(SystemModel.prototype, KadiraModel.prototype);

SystemModel.prototype.buildPayload = function() {
  var metrics = {};
  var now = Ntp._now();
  metrics.startTime = Kadira.syncedDate.syncTime(this.startTime);
  metrics.endTime = Kadira.syncedDate.syncTime(now);

  metrics.sessions = _.keys(Meteor.default_server.sessions).length;
  metrics.memory = process.memoryUsage().rss / (1024*1024);
  metrics.newSessions = this.newSessions;
  this.newSessions = 0;

  if(this.usageLookup && !this._dontTrackUsage) {
    try {
      metrics.pcpu = this.usageLookup(process.pid, {keepHistory: true}).cpu;
      // this metric will be added soon. So we just need to make it reserved
      metrics.cputime = -1;
    } catch(ex) {
      if(/Unsupported OS/.test(ex.message)) {
        this._dontTrackUsage = true;
        var message =
          "kadira: we can't track CPU usage in this OS. " +
          "But it will work when you deploy your app!"
        console.warn(message);
      } else {
        throw ex;
      }
    }
  }

  this.startTime = now;
  return {systemMetrics: [metrics]};
};
