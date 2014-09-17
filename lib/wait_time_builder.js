var WAITON_MESSAGE_FIELDS = ['msg', 'id', 'method', 'name', 'waitTime'];

// This is way how we can build waitTime and it's breakdown
WaitTimeBuilder = function() {
  this._waitListStore = {};
  this._currentProcessingMessages = {};
  this._messageCache = {};
};

WaitTimeBuilder.prototype.register = function(msgId, session) {
  var self = this;
  var waitList = session.inQueue.map(this._getCacheMessage.bind(this));

  //add currently processing ddp message if exists
  if(session.workerRunning) {
    var currentlyProcessingMessage = this._currentProcessingMessages[session.id];
    waitList.unshift(this._getCacheMessage(currentlyProcessingMessage));
  }

  this._waitListStore[msgId] = waitList;
};

WaitTimeBuilder.prototype._getCacheMessage = function(msg) {
  var self = this;
  var cachedMessage = self._messageCache[msg.id];
  if(!cachedMessage) {
    self._messageCache[msg.id] = cachedMessage = _.pick(msg, WAITON_MESSAGE_FIELDS);
    cachedMessage._registered = 1;
  } else {
    cachedMessage._registered++;
  }

  return cachedMessage;
};

WaitTimeBuilder.prototype._cleanCacheMessage = function(msg) {
  msg._registered--;
  if(msg._registered == 0) {
    this._messageCache[msg.id] = null;
  }

  // need to send a clean set of objects
  // otherwise register can go with this
  return _.pick(msg, WAITON_MESSAGE_FIELDS);
};

WaitTimeBuilder.prototype.build = function(msgId) {
  var waitList = this._waitListStore[msgId];
  this._waitListStore[msgId] = null;
  var filteredWaitList =  waitList.map(this._cleanCacheMessage.bind(this));
  return filteredWaitList;
};

WaitTimeBuilder.prototype.trackWaitTime = function(sessionId, msg, unblock) {
  var self = this;
  var started = Date.now();
  self._currentProcessingMessages[sessionId] = msg;

  var unblocked = false;
  var wrappedUnblock = function() {
    if(!unblocked) {
      var waitTime = Date.now() - started;
      var cachedMessage = self._messageCache[msg.id];
      if(cachedMessage) {
        cachedMessage.waitTime = waitTime;
      }
      self._currentProcessingMessages[sessionId] = null;
      unblocked = true;
      unblock();
    }
  };

  return wrappedUnblock;
};