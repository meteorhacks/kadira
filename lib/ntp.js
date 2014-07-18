var http = Npm.require('http');
var logger = Npm.require('debug')("kadira:ntp");
var Fiber = Npm.require('fibers');

Ntp = function (endpoint) {
  this.endpoint = endpoint + '/simplentp/sync';
  this.diff = 0;
  this.reSyncCount = 0;
  this.reSync = new Retry({
    baseTimeout: 1000*60,
    maxTimeout: 1000*60*10,
    minCount: 0
  });
}

Ntp._now = function() {
  var now = Date.now();
  if(typeof now == 'number') {
    return now;
  } else if(now instanceof Date) {
    // some extenal JS libraries override Date.now and returns a Date object
    // which directly affect us. So we need to prepare for that
    return now.getTime();
  } else {
    // trust me. I've seen now === undefined
    return (new Date()).getTime();
  }
};

Ntp.prototype.getTime = function() {
  return Ntp._now() + Math.round(this.diff);
};

Ntp.prototype.syncTime = function(localTime) {
  return localTime + Math.ceil(this.diff);
};

Ntp.prototype.sync = function() {
  logger('init sync');
  var self = this;
  var retryCount = 0;
  var retry = new Retry({
    baseTimeout: 1000*20,
    maxTimeout: 1000*60,
    minCount: 1
  });
  syncTime();

  function syncTime () {
    if(retryCount<5) {
      logger('attempt time sync with server', retryCount);
      retry.retryLater(retryCount++, getStartTime);
    } else {
      logger('maximum retries reached');
      self.reSync.retryLater(self.reSyncCount++, self.sync.bind(self));
    }
  }

  function getStartTime () {
    new Fiber(function () {
      HTTP.get(self.endpoint, function (err, res) {
        if(!err) {
          getServerTime();
        } else {
          syncTime();
        }
      });
    }).run();
  }

  function getServerTime () {
    new Fiber(function () {
      var startTime = Ntp._now();
      HTTP.get(self.endpoint, function (err, res) {
        var serverTime = parseInt(res.content);
        if(!err && serverTime) {
          // (Ntp._now() + startTime)/2 : Midpoint between req and res
          self.diff = serverTime - (Ntp._now() + startTime)/2;
          self.reSync.retryLater(self.reSyncCount++, self.sync.bind(self));
          logger('successfully updated diff value', self.diff);
        } else {
          syncTime();
        }
      });
    }).run();
  }
}
