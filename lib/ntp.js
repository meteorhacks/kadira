var http = Npm.require('http');
var logger = Npm.require('debug')("apm:ntp");
var Fiber = Npm.require('fibers');

Ntp = function (endpoint) {
  this.endpoint = endpoint + '/simplentp/sync';
  this.diff = 0;
  this.retryCount = 0;
  this.retry = new Retry({
    baseTimeout: 1000*60,
    maxTimeout: 1000*60*10,
    minCount: 0,
  });
}

Ntp.prototype.getTime = function() {
  return Date.now() + Math.round(this.diff);
};

Ntp.prototype.sync = function() {
  logger('init sync');
  var self = this;
  var retriesLeft = 5;
  syncTime();

  function syncTime () {
    if(retriesLeft-->0) {
      logger('attempt time sync with server');
      getStartTime();
    } else {
      logger('maximum retries reached');
      self.retry.retryLater(self.retryCount++, self.sync.bind(self));
    }
  }

  function getStartTime () {
    new Fiber(function () {
      HTTP.get(self.endpoint, function (err, res) {
        if(!err) {
          var startTime = Date.now();
          getServerTime(startTime);
        } else {
          syncTime();
        }
      });
    }).run();
  }

  function getServerTime (startTime) {
    new Fiber(function () {
      HTTP.get(self.endpoint, function (err, res) {
        var serverTime = parseInt(res.content);
        if(!err && serverTime) {
          // (Date.now() + startTime)/2 : Midpoint between req and res
          self.diff = serverTime - (Date.now() + startTime)/2;
          self.retry.retryLater(self.retryCount++, self.sync.bind(self));
          logger('successfully updated diff value', self.diff);
        } else {
          syncTime();
        }
      });
    }).run();
  }
}
