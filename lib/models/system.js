var os = Npm.require('os');

SystemModel = function () {
  var self = this;
  this.startTime = Ntp._now();
  this.newSessions = 0;
  this._sessionMap = {}
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

SystemModel.prototype.handleSessionActivity = function(ddpMessage, sessionId) {
  var self = this;
  var oldSession = this._sessionMap[ddpMessage.session];
  var trackNewSession = _.once(function(doTrack) {
    if(doTrack === false) return;
    self.newSessions++;
  });

  if(oldSession) {
    // there is a oldSession, that mean there this is just reconnecting
    // so make sure, we don't track a newSession
    trackNewSession(false);
  }

  var exisitingSession = this._sessionMap[sessionId];
  if(exisitingSession) {
    // if the session is inactive for sessionTimeout then 
    // count for a newSession again
    var inactiveTime = Date.now() - exisitingSession.activeAt;
    if(inactiveTime > this.sessionTimeout) {
      trackNewSession();
    }

    // activate session only for actual messages
    if(['sub', 'unsub', 'method'].indexOf(ddpMessage.msg) != -1) {
      exisitingSession.activeAt = Date.now();
    }
  } else {
    // create new Session
    this._sessionMap[sessionId] = {
      id: sessionId,
      createdAt: Date.now(),
      activeAt: Date.now(),
      timeoutHandler: deleteSession(Date.now())
    };

    function deleteSession(timeoutFrom) {
      var timeoutValue = self.sessionTimeout - (Date.now() - timeoutFrom);
      timeoutValue = (timeoutValue < 0)? 0 : timeoutValue;
      return setTimeout(function() {
        var sessionToDelete = self._sessionMap[sessionId];
        if(!sessionToDelete) return;

        var inactiveTime = Date.now() - sessionToDelete.activeAt;
        if(inactiveTime < self.sessionTimeout) {
          sessionToDelete.timeoutHandler = deleteSession(sessionToDelete.activeAt);
        } else {
          delete self._sessionMap[sessionId];
        }
      }, timeoutValue);
    }

    trackNewSession();
  }
};