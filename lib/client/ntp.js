
Ntp = function (endpoint) {
  this.endpoint = endpoint + '/simplentp/sync/jsonp';
  this.diff = 0;
  this.reSyncCount = 0;
  this.reSync = new Retry({
    baseTimeout: 1000*60,
    maxTimeout: 1000*60*10,
    minCount: 0
  });
}

Ntp.prototype.getTime = function() {
  return Date.now() + Math.round(this.diff);
};

Ntp.prototype.syncTime = function(localTime) {
  return localTime + Math.ceil(this.diff);
};

Ntp.prototype.sync = function() {
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
      retry.retryLater(retryCount++, getStartTime);
    } else {
      self.reSync.retryLater(self.reSyncCount++, self.sync.bind(self));
    }
  }

  function getStartTime () {
    $.ajax({
      url: self.endpoint,
      jsonp: 'callback',
      dataType: 'jsonp',
      success: function(serverTime) {
        getServerTime()
      },
      error: function(argument) {
        syncTime()
      }
    });
  }

  function getServerTime () {
    var startTime = Date.now();
    $.ajax({
      url: self.endpoint,
      jsonp: 'callback',
      dataType: 'jsonp',
      success: function(serverTime) {
        self.diff = serverTime - (Date.now() + startTime)/2;
        self.reSync.retryLater(self.reSyncCount++, self.sync.bind(self));
      },
      error: function(argument) {
        syncTime()
      }
    });
  }
}
