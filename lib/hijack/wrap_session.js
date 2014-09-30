wrapSession = function(sessionProto) {
  var originalProcessMessage = sessionProto.processMessage;
  sessionProto.processMessage = function(msg) {
    if(Kadira.connected) {
      //only add kadiraInfo if it is connected
      var kadiraInfo = {
        session: this.id,
        userId: this.userId
      };

      if(msg.msg == 'method' || msg.msg == 'sub') {
        kadiraInfo.trace = Kadira.tracer.start(this, msg);
        Kadira.waitTimeBuilder.register(this, msg.id);

        //use JSON stringify to save the CPU
        var startData = { userId: this.userId, params: JSON.stringify(msg.params) };
        Kadira.tracer.event(kadiraInfo.trace, 'start', startData);
        var waitEventId = Kadira.tracer.event(kadiraInfo.trace, 'wait', {}, kadiraInfo);
        msg._waitEventId = waitEventId;
        msg.__kadiraInfo = kadiraInfo;

        if(msg.msg == 'sub') {
          // start tracking inside processMessage allows us to indicate
          // wait time as well
          Kadira.models.pubsub._trackSub(this, msg);
        }
      }
    }

    return originalProcessMessage.call(this, msg);
  };

  //adding the method context to the current fiber
  var originalMethodHandler = sessionProto.protocol_handlers.method;
  sessionProto.protocol_handlers.method = function(msg, unblock) {
    var self = this;
    //add context
    var kadiraInfo = msg.__kadiraInfo;
    Kadira._setInfo(kadiraInfo);

    // end wait event
    var waitList = Kadira.waitTimeBuilder.build(this, msg.id);
    Kadira.tracer.eventEnd(kadiraInfo.trace, msg._waitEventId, {waitOn: waitList});

    unblock = Kadira.waitTimeBuilder.trackWaitTime(this, msg, unblock);
    var response = Kadira.env.kadiraInfo.withValue(kadiraInfo, function () {
      return originalMethodHandler.call(self, msg, unblock);
    });
    unblock();
    return response;
  };

  //to capture the currently processing message
  var orginalSubHandler = sessionProto.protocol_handlers.sub;
  sessionProto.protocol_handlers.sub = function(msg, unblock) {
    var self = this;
    //add context
    var kadiraInfo = msg.__kadiraInfo;
    Kadira._setInfo(kadiraInfo);

    // end wait event
    var waitList = Kadira.waitTimeBuilder.build(this, msg.id);
    Kadira.tracer.eventEnd(kadiraInfo.trace, msg._waitEventId, {waitOn: waitList});

    unblock = Kadira.waitTimeBuilder.trackWaitTime(this, msg, unblock);
    var response = Kadira.env.kadiraInfo.withValue(kadiraInfo, function () {
      return orginalSubHandler.call(self, msg, unblock);
    });
    unblock();
    return response;
  };

  //to capture the currently processing message
  var orginalUnSubHandler = sessionProto.protocol_handlers.unsub;
  sessionProto.protocol_handlers.unsub = function(msg, unblock) {
    unblock = Kadira.waitTimeBuilder.trackWaitTime(this, msg, unblock);
    var response = orginalUnSubHandler.call(this, msg, unblock);
    unblock();
    return response;
  };

  //track method ending (to get the result of error)
  var originalSend = sessionProto.send;
  sessionProto.send = function(msg) {
    if(msg.msg == 'result') {
      var kadiraInfo = Kadira._getInfo();
      if(msg.error) {
        var error = _.pick(msg.error, ['message', 'stack']);

        // pick the error from the wrapped method handler
        if(kadiraInfo && kadiraInfo.currentError) {
          // the error stack is wrapped so Meteor._debug can identify
          // this as a method error.
          error = _.pick(kadiraInfo.currentError, ['message', 'stack']);
        }

        Kadira.tracer.endLastEvent(kadiraInfo.trace);
        Kadira.tracer.event(kadiraInfo.trace, 'error', {error: error});
      } else {
        var isForced = Kadira.tracer.endLastEvent(kadiraInfo.trace);
        if (isForced) {
          console.warn('Kadira endevent forced complete', JSON.stringify(kadiraInfo.trace.events));
        };
        Kadira.tracer.event(kadiraInfo.trace, 'complete');
      }

      if(kadiraInfo) {
        //processing the message
        var trace = Kadira.tracer.buildTrace(kadiraInfo.trace);
        Kadira.models.methods.processMethod(trace);

        // error may or may not exist and error tracking can be disabled
        if(error && Kadira.options.enableErrorTracking) {
          // if we have currentError, we should track that
          // otherwise, try to get  error from DDP message 
          var errorToTrack = kadiraInfo.currentError || error;
          Kadira.models.error.trackError(errorToTrack, trace);
        }

        //clean and make sure, fiber is clean
        //not sure we need to do this, but a preventive measure
        Kadira._setInfo(null);
      }
    }

    return originalSend.call(this, msg);
  };

  //for the pub/sub data-impact calculation
  ['sendAdded', 'sendChanged', 'sendRemoved'].forEach(function(funcName) {
    var originalFunc = sessionProto[funcName];
    sessionProto[funcName] = function(collectionName, id, fields) {
      var self = this;
      //fields is not relevant for `sendRemoved`, but does make any harm
      var eventName = funcName.substring(4).toLowerCase();
      var subscription = Kadira.env.currentSub;

      if(subscription) {
        // we need to pick the actual DDP message send by the meteor
        // otherwise that'll add a huge performance issue
        // that's why we do this nasty hack, but it works great
        var originalSocketSend = self.socket.send;
        var stringifiedFields;
        self.socket.send = function(rawData) {
          stringifiedFields = rawData;
          originalSocketSend.call(self, rawData);
        };

        var res = originalFunc.call(self, collectionName, id, fields);
        Kadira.models.pubsub._trackNetworkImpact(self, subscription, eventName, collectionName, id, stringifiedFields);
        
        // revert to the original function
        self.socket.send = originalSocketSend;
        return res;
      } else {
        return originalFunc.call(self, collectionName, id, fields);
      }
    };
  });
};

// wrap existing method handlers for capturing errors
_.each(Meteor.default_server.method_handlers, function(handler, name) {
  wrapMethodHanderForErrors(name, handler, Meteor.default_server.method_handlers);
});

// wrap future method handlers for capturing errors
var originalMeteorMethods = Meteor.methods;
Meteor.methods = function(methodMap) {
  _.each(methodMap, function(handler, name) {
    wrapMethodHanderForErrors(name, handler, methodMap);
  });
  originalMeteorMethods(methodMap);
};


function wrapMethodHanderForErrors(name, originalHandler, methodMap) {
  methodMap[name] = function() {
    try{
      return originalHandler.apply(this, arguments);
    } catch(ex) {
      if(Kadira._getInfo()) {
        Kadira._getInfo().currentError = ex;
        
        // wrap error stack so Meteor._debug can identify and ignore it
        var ErrorConstructor = (ex instanceof Meteor.Error)? Meteor.Error: Error;
        var newError = new ErrorConstructor(ex.message);
        newError.stack = {stack: ex.stack, source: 'method'};
        ex = newError;
      }
      throw ex;
    }
  }
}
