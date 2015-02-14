hijackDBOps = function hijackDBOps() {
  var mongoConnectionProto = MeteorX.MongoConnection.prototype;

  //findOne is handled by find - so no need to track it
  //upsert is handles by update
  ['find', 'update', 'remove', 'insert', '_ensureIndex', '_dropIndex'].forEach(function(func) {
    var originalFunc = mongoConnectionProto[func];
    mongoConnectionProto[func] = function(collName, selector, mod, options) {
      options = options || {};
      var payload = {
        coll: collName,
        func: func,
      };

      if(func == 'insert') {
        //add nothing more to the payload
      } else if(func == '_ensureIndex' || func == '_dropIndex') {
        //add index
        payload.index = JSON.stringify(selector);
      } else if(func == 'update' && options.upsert) {
        payload.func = 'upsert';
        payload.selector = JSON.stringify(selector);
      } else {
        //all the other functions have selectors
        payload.selector = JSON.stringify(selector);
      }

      var kadiraInfo = Kadira._getInfo();
      if(kadiraInfo) {
        var eventId = Kadira.tracer.event(kadiraInfo.trace, 'db', payload);
      }

      //this cause V8 to avoid any performance optimizations, but this is must to use
      //otherwise, if the error adds try catch block our logs get messy and didn't work
      //see: issue #6
      try{
        var ret = originalFunc.apply(this, arguments);
        //handling functions which can be triggered with an asyncCallback
        var endOptions = {};

        if(HaveAsyncCallback(arguments)) {
          endOptions.async = true;
        }

        if(func == 'update') {
          // upsert only returns an object when called `upsert` directly
          // otherwise it only act an update command
          if(options.upsert && typeof ret == 'object') {
            endOptions.updatedDocs = ret.numberAffected;
            endOptions.insertedId = ret.insertedId;
          } else {
            endOptions.updatedDocs = ret;
          }
        } else if(func == 'remove') {
          endOptions.removedDocs = ret;
        }

        if(eventId) {
          Kadira.tracer.eventEnd(kadiraInfo.trace, eventId, endOptions);
        }
      } catch(ex) {
        if(eventId) {
          Kadira.tracer.eventEnd(kadiraInfo.trace, eventId, {err: ex.message});
        }
        throw ex;
      }

      return ret;
    };
  });

  var cursorProto = MeteorX.MongoCursor.prototype;
  ['forEach', 'map', 'fetch', 'count', 'observeChanges', 'observe', 'rewind'].forEach(function(type) {
    var originalFunc = cursorProto[type];
    cursorProto[type] = function() {
      var cursorDescription = this._cursorDescription;
      var payload = {
        coll: cursorDescription.collectionName,
        selector: JSON.stringify(cursorDescription.selector),
        func: type,
        cursor: true
      };

      if(cursorDescription.options) {
        var options = _.pick(cursorDescription.options, ['fields', 'sort', 'limit']);
        for(var field in options) {
          var value = options[field]
          if(typeof value == 'object') {
            value = JSON.stringify(value);
          }
          payload[field] = value;
        }
      };

      var kadiraInfo = Kadira._getInfo();
      if(kadiraInfo) {
        var eventId = Kadira.tracer.event(kadiraInfo.trace, 'db', payload);
      }

      try{
        var ret = originalFunc.apply(this, arguments);

        var endData = {};
        if(type == 'observeChanges' || type == 'observe') {
          var observerDriver;
          endData.oplog = false;
          // get data written by the multiplexer
          endData.wasMultiplexerReady = ret._wasMultiplexerReady;
          endData.queueLength = ret._queueLength;
          endData.elapsedPollingTime = ret._elapsedPollingTime;

          if(ret._multiplexer) {
            endData.noOfHandles = Object.keys(ret._multiplexer._handles).length;

            // older meteor versions done not have an _multiplexer value
            observerDriver = ret._multiplexer._observeDriver;
            if(observerDriver) {
              observerDriver = ret._multiplexer._observeDriver;
              var observerDriverClass = observerDriver.constructor;
              var usesOplog = typeof observerDriverClass.cursorSupported == 'function';
              endData.oplog = usesOplog;
              var size = 0;
              ret._multiplexer._cache.docs.forEach(function() {size++});
              endData.noOfCachedDocs = size;

              // if multiplexerWasNotReady, we need to get the time spend for the polling
              if(!ret._wasMultiplexerReady) {
                endData.initialPollingTime = observerDriver._lastPollTime;
              }
            }
          }

          if(!endData.oplog) {
            // let's try to find the reason
            var reasonInfo = Kadira.checkWhyNoOplog(cursorDescription, observerDriver);
            endData.noOplogCode = reasonInfo.code;
            endData.noOplogReason = reasonInfo.reason;
            endData.noOplogSolution = reasonInfo.solution;
          }
        } else if(type == 'fetch' || type == 'map'){
          //for other cursor operation
          endData.docsFetched = ret.length;
        }

        if(eventId) {
          Kadira.tracer.eventEnd(kadiraInfo.trace, eventId, endData);
        }
        return ret;
      } catch(ex) {
        if(eventId) {
          Kadira.tracer.eventEnd(kadiraInfo.trace, eventId, {err: ex.message});
        }
        throw ex;
      }
    };
  });
};