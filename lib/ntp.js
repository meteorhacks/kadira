var http = Npm.require('http');
var url = Npm.require('url');

Ntp = function(endpoint) {
  var parseEndoint = url.parse(endpoint);
  this.httpOptions = {
    hostname: parseEndoint.hostname,
    port: parseEndoint.port,
    method: 'POST',
    path: '/_ntp/sync'
  };

  this.diff = 0;
  this.retries = 0;
}

Ntp.prototype.getTime = function() {
  return Date.now() + this.diff;
};

Ntp.prototype.sync = function() {
  var self = this;
  var beginTime;
  var endTime;
  var serverTime;
  var diffProcessed = false;

  //reset retries
  self.retries = 0;

  var req = http.request(self.httpOptions, function(res) {
    if(res.statusCode == 200) {
      res.on('data', onData);
      res.on('end', onEnd);
    } else {
      console.error('NTP sync failed - status code:', res.statusCode);
      cleanup();
      self._retrySync();
    }

    res.setEncoding('utf8');

    function onData(data) {
      if(data == 'CONNECTED') {
        beginTime = Date.now();
        req.write('DATE_SYNC');
      } else {
        endTime = Date.now();
        serverTime = parseInt(data);

        var networkLatency = (endTime - beginTime)/2;
        self.diff = serverTime - (endTime - networkLatency);
        
        diffProcessed = true;
        cleanup();
      }
    }

    function onEnd() {
      if(!diffProcessed) {
        console.debug('closed NTP request before completed');
        self._retrySync();
      }
      cleanup();
    }

    function cleanup() {
      res.removeListener('data', onData);
      res.removeListener('end', onEnd);

      req.end();
      req.removeListener('error', onReqError); 
    }
  });

  req.once('error', onReqError);
  req.write('INIT');

  function onReqError(err) {
    console.error('NTP request error: ', err.messsage);
    self._retrySync();
  }
};

Ntp.prototype._retrySync = function() {
  if(++this.retries <= 5) {
    setTimeout(this.sync.bind(this), this.retries * 1000);
  } else {
    console.error('Maximum(' + this.retries + ') NTP retries exceeded');
  }
};