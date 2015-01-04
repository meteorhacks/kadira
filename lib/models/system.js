var os = Npm.require('os');
var gc = Npm.require('gc-profiler');

SystemModel = function () {
  var self = this;
  this.startTime = Ntp._now();
  this.newSessions = 0;
  this.gcScavengeCount = 0;
  this.gcScavengeDuration = 0;
  this.gcFullCount = 0;
  this.gcFullDuration = 0;
  this.sessionTimeout = 1000 * 60 * 30; //30 min

  try {
    var usage = Kadira._binaryRequire('usage');
    this.usageLookup = Kadira._wrapAsync(usage.lookup.bind(usage));
  } catch(ex) {
    console.error('Kadira: usage npm module loading failed - ', ex.message);
  }

  gc.on('gc', function (info) {
    if(info.type === 'Scavenge') {
      self.gcScavengeCount++;
      self.gcScavengeDuration += info.duration;
    } else if(info.type === 'MarkSweepCompact') {
      self.gcFullCount++;
      self.gcFullDuration += info.duration;
    }
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

  metrics.gcScavengeCount = this.gcScavengeCount;
  this.gcScavengeCount = 0;
  metrics.gcScavengeDuration = parseInt(this.gcScavengeDuration);
  this.gcScavengeDuration = 0;
  metrics.gcFullCount = this.gcFullCount;
  this.gcFullCount = 0;
  metrics.gcFullDuration = parseInt(this.gcFullDuration);
  this.gcFullDuration = 0;

  var usage = this.getUsage() || {};
  metrics.pcpu = usage.cpu;
  if(usage.cpuInfo) {
    metrics.cputime = usage.cpuInfo.cpuTime;
    metrics.pcpuUser = usage.cpuInfo.pcpuUser;
    metrics.pcpuSystem = usage.cpuInfo.pcpuSystem;
  }

  this.startTime = now;
  return {systemMetrics: [metrics]};
};

SystemModel.prototype.getUsage = function() {
  if(this.usageLookup && !this._dontTrackUsage) {
    try {
      return this.usageLookup(process.pid, {keepHistory: true});
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
};

SystemModel.prototype.handleSessionActivity = function(msg, session) {
  if(msg.msg === 'connect' && !msg.session) {
    this.countNewSession(session);
  } else if(['sub', 'method'].indexOf(msg.msg) != -1) {
    if(!this.isSessionActive(session)) {
      this.countNewSession(session);
    }
  }
  session._activeAt = Date.now();
}

SystemModel.prototype.countNewSession = function(session) {
  if(!isLocalAddress(session.socket)) {
    this.newSessions++;
  }
}

SystemModel.prototype.isSessionActive = function(session) {
  var inactiveTime = Date.now() - session._activeAt;
  return inactiveTime < this.sessionTimeout;
}

// ------------------------------------------------------------------------- //

// http://regex101.com/r/iF3yR3/2
var isLocalHostRegex = /^(?:.*\.local|localhost)(?:\:\d+)?|127(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}$/;

// http://regex101.com/r/hM5gD8/1
var isLocalAddressRegex = /^127(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}$/;

function isLocalAddress (socket) {
  var host = socket.headers['host'];
  if(host) return isLocalHostRegex.test(host);
  var address = socket.headers['x-forwarded-for'] || socket.remoteAddress;
  if(address) return isLocalAddressRegex.test(address);
}
