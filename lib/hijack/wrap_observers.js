wrapOplogObserveDriver = function(proto) {
  var originalRunQuery = proto._runQuery;
  proto._runQuery = function() {
    var start = Date.now();
    originalRunQuery.call(this);
    this._lastPollTime = Date.now() - start;
  };

  var originalStop = proto.stop;
  proto.stop = function() {
    if(this._ownerInfo && this._ownerInfo.type === 'sub') {
      Kadira.EventBus.emit('pubsub', 'observerDeleted', this._ownerInfo);
      Kadira.models.pubsub.trackDeletedObserver(this._ownerInfo);
    }

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
    if(this._ownerInfo && this._ownerInfo.type === 'sub') {
      Kadira.EventBus.emit('pubsub', 'observerDeleted', this._ownerInfo);
      Kadira.models.pubsub.trackDeletedObserver(this._ownerInfo);
    }

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

wrapForCountingObservers = function() {
  // to count observers
  var mongoConnectionProto = MeteorX.MongoConnection.prototype;
  var originalObserveChanges = mongoConnectionProto._observeChanges;
  mongoConnectionProto._observeChanges = function(cursorDescription, ordered, callbacks) {
    var ret = originalObserveChanges.call(this, cursorDescription, ordered, callbacks);
    // get the Kadira Info via the Meteor.EnvironmentalVariable
    var kadiraInfo = Kadira._getInfo(null, true);

    if(kadiraInfo && ret._multiplexer) {
      if(!ret._multiplexer.__kadiraTracked) {
        // new multiplexer
        ret._multiplexer.__kadiraTracked = true;
        Kadira.EventBus.emit('pubsub', 'newSubHandleCreated', kadiraInfo.trace);
        Kadira.models.pubsub.incrementHandleCount(kadiraInfo.trace, false);
        if(kadiraInfo.trace.type == 'sub') {
          var ownerInfo = {
            type: kadiraInfo.trace.type,
            name: kadiraInfo.trace.name,
          };

          var observerDriver = ret._multiplexer._observeDriver;
          observerDriver._ownerInfo = ownerInfo;
          Kadira.EventBus.emit('pubsub', 'observerCreated', ownerInfo);
          Kadira.models.pubsub.trackCreatedObserver(ownerInfo);
        }
      } else {
        Kadira.EventBus.emit('pubsub', 'cachedSubHandleCreated', kadiraInfo.trace);
        Kadira.models.pubsub.incrementHandleCount(kadiraInfo.trace, true);
      }
    }

    return ret;
  }
};