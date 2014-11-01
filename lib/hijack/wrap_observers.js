wrapOplogObserveDriver = function(proto) {
  var originalRunQuery = proto._runQuery;
  proto._runQuery = function() {
    var start = Date.now();
    originalRunQuery.call(this);
    this._lastPollTime = Date.now() - start;
  };

  var originalStop = proto.stop;
  proto.stop = function() {
    if(this._ownerInfo.type === 'sub')
      Kadira.models.pubsub.trackDeletedObserver(this._ownerInfo);
    return originalStop.call(this);
  };
};

wrapPollingObserveDriver = function(proto) {
  var originalPollMongo = proto._pollMongo;
  proto._pollMongo = function() {
    var start = Date.now();
    originalPollMongo.call(this);
    this._lastPollTime = Date.now() - start;
  };

  var originalStop = proto.stop;
  proto.stop = function() {
    if(this._ownerInfo.type === 'sub')
      Kadira.models.pubsub.trackDeletedObserver(this._ownerInfo);
    return originalStop.call(this);
  };
};

wrapMultiplexer = function(proto) {
  var originalInitalAdd = proto.addHandleAndSendInitialAdds;
  proto.addHandleAndSendInitialAdds = function(handle) {
    if(!this._firstInitialAddTime) {
      this._firstInitialAddTime = Date.now();
    }

    handle._wasMultiplexerReady = this._ready();
    handle._queueLength = this._queue._taskHandles.length;

    if(!handle._wasMultiplexerReady) {
      handle._elapsedPollingTime = Date.now() - this._firstInitialAddTime;
    }
    return originalInitalAdd.call(this, handle);
  };
};

// to count observers
var mongoConnectionProto = MeteorX.MongoConnection.prototype;
var originalObserveChanges = mongoConnectionProto._observeChanges;
mongoConnectionProto._observeChanges = function(cursorDescription, ordered, callbacks) {
  var ret = originalObserveChanges.call(this, cursorDescription, ordered, callbacks);
  var kadiraInfo = Kadira._getInfo();

  if(kadiraInfo && ret._multiplexer) {
    var ownerInfo = {
      type: kadiraInfo.trace.type,
      name: kadiraInfo.trace.name,
      id: kadiraInfo.trace.id
    };

    var observerDriver = ret._multiplexer._observeDriver;
    observerDriver._ownerInfo = ownerInfo;
    if(ownerInfo.type === 'sub')
      Kadira.models.pubsub.trackCreatedObserver(ownerInfo);
  }

  return ret;
}
