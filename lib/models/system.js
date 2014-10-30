var os = Npm.require('os');

SystemModel = function () {
  var self = this;
  this.startTime = Ntp._now();
  this.newSessions = 0;
  this.sessionTimeout = 1000 * 60 * 30; //30 min

  try {
    var usage = Kadira._binaryRequire('usage');
    this.usageLookup = Kadira._wrapAsync(usage.lookup.bind(usage));
  } catch(ex) {
    console.error('Kadira: usage npm module loading failed - ', ex.message);
  }
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

  var usage = this.getUsage() || {};
  metrics.pcpu = usage.cpu;
  metrics.cputime = -1;

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
  } else if(['sub', 'unsub', 'method'].indexOf(msg.msg) != -1) {
    if(!this.isSessionActive(session)) {
      this.countNewSession(session);
    }
  }
  session._activeAt = Date.now();
}

SystemModel.prototype.countNewSession = function(session) {
  var address = session.socket.headers['x-forwarded-for'] || session.socket.remoteAddress;
  if(!isLocalAddress(address) && !session._isReconnect) {
    this.newSessions++;
  }
}

SystemModel.prototype.isSessionActive = function(session) {
  var inactiveTime = Date.now() - session._activeAt;
  return inactiveTime < this.sessionTimeout;
}

// ------------------------------------------------------------------------- //

var isLocalRegexArray = [
  /^(?:127)(?:\.[0-9]{1,3}){3}$/,
  /^192\.168(?:\.[0-9]{1,3}){2}$/,
  /^10(?:\.[0-9]{1,3}){3}$/,
  /^172\.(?:1[6-9]|2[0-9]|3[0-1])(?:\.[0-9]{1,3}){2}$/
];

function isLocalAddress (address) {
  for(var i = 0; i < isLocalRegexArray.length; ++i) {
    if(isLocalRegexArray[i].test(address)) {
      return true;
    }
  }
}
