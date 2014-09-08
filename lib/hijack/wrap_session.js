//only method, sub and unsub are valid messages
//so following fields would only required
var WAITON_MESSAGE_FIELDS = ['msg', 'id', 'method', 'name'];

wrapSession = function(sessionProto) {

  //store the currently running DDP message per session
  //we have to add this to the top of the waiting message
  var currentlyProcessingDDPMessage = {};

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

        var waitOnMessages = this.inQueue.map(function(msg) {
          return _.pick(msg, WAITON_MESSAGE_FIELDS);
        });

        //add currently processing ddp message if exists
        if(this.workerRunning) {
          waitOnMessages.unshift(_.pick(currentlyProcessingDDPMessage[this.id], WAITON_MESSAGE_FIELDS));
        }

        //use JSON stringify to save the CPU
        var startData = { userId: this.userId, params: JSON.stringify(msg.params) };
        Kadira.tracer.event(kadiraInfo.trace, 'start', startData);
        var waitEventId = Kadira.tracer.event(kadiraInfo.trace, 'wait', {waitOn: waitOnMessages}, kadiraInfo);
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
    currentlyProcessingDDPMessage[this.id] = msg;
    //add context
    var kadiraInfo = msg.__kadiraInfo;
    Kadira._setInfo(kadiraInfo);

    Kadira.tracer.eventEnd(kadiraInfo.trace, msg._waitEventId);

    return Kadira.env.kadiraInfo.withValue(kadiraInfo, function () {
      return originalMethodHandler.call(self, msg, unblock);
    });
  };

  //to capture the currently processing message
  var orginalSubHandler = sessionProto.protocol_handlers.sub;
  sessionProto.protocol_handlers.sub = function(msg, unblock) {
    var self = this;
    currentlyProcessingDDPMessage[this.id] = msg;

    //add context
    var kadiraInfo = msg.__kadiraInfo;
    Kadira._setInfo(kadiraInfo);

    Kadira.tracer.eventEnd(kadiraInfo.trace, msg._waitEventId);

    return Kadira.env.kadiraInfo.withValue(kadiraInfo, function () {
      return orginalSubHandler.call(self, msg, unblock);
    });
  };

  //to capture the currently processing message
  var orginalUnSubHandler = sessionProto.protocol_handlers.unsub;
  sessionProto.protocol_handlers.unsub = function(msg, unblock) {
    currentlyProcessingDDPMessage[this.id] = msg;
    return orginalUnSubHandler.call(this, msg, unblock);
  };

  //we need to clear currentlyProcessingDDPMessage just after the session destroyed
  //otherwise, it will leads to a potential memory leaks
  var originalDestroy = sessionProto.destroy;
  sessionProto.destroy = function() {
    delete currentlyProcessingDDPMessage[this.id];
    return originalDestroy.call(this);
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
          error = {
            message: kadiraInfo.currentError.message,
            stack: kadiraInfo.currentError.stack.stack
          };
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
          Kadira.models.error.trackError(error, trace);
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
      //fields is not relevant for `sendRemoved`, but does make any harm
      var eventName = funcName.substring(4).toLowerCase();
      var subscription = Kadira.env.currentSub.get();

      if(subscription) {
        var session = this;
        Kadira.models.pubsub._trackNetworkImpact(session, subscription, eventName, collectionName, id, fields);
      }

      return originalFunc.call(this, collectionName, id, fields);
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
        // wrap error stack so Meteor._debug can identify and ignore it
        ex.stack = {stack: ex.stack, source: 'method'};
        Kadira._getInfo().currentError = ex;
      }
      throw ex;
    }
  }
}
