//only method, sub and unsub are valid messages
//so following fields would only required
var WAITON_MESSAGE_FIELDS = ['msg', 'id', 'method', 'name'];

wrapSession = function(sessionProto) {

  //store the currently running DDP message per session
  //we have to add this to the top of the waiting message
  var currentlyProcessingDDPMessage = {};

  var originalProcessMessage = sessionProto.processMessage;
  sessionProto.processMessage = function(msg) {
    if(Apm.connected) {
      //only add apmInfo if it is connected
      var apmInfo = {
        session: this.id,
        userId: this.userId
      };

      if(msg.msg == 'method') {
        apmInfo.method = {
          session: this.id,
          name: msg.method,
          id: msg.id,
          events: [],
          _id: this.id + "::" + msg.id
        };
        msg.__apmInfo = apmInfo;

        var waitOnMessages = this.inQueue.map(function(msg) {
          return _.pick(msg, WAITON_MESSAGE_FIELDS);
        });

        //add currently processing ddp message if exists
        if(this.workerRunning) {
          waitOnMessages.unshift(_.pick(currentlyProcessingDDPMessage[this.id], WAITON_MESSAGE_FIELDS));
        }

        var startData = { userId: this.userId };
        NotificationManager.methodTrackEvent('start', startData, apmInfo);
        var waitEventId = NotificationManager.methodTrackEvent('wait', {waitOn: waitOnMessages}, apmInfo);
        msg._waitEventId = waitEventId;
      }
    }

    return originalProcessMessage.call(this, msg);
  };

  //adding the method context to the current fiber
  var originalMethodHandler = sessionProto.protocol_handlers.method;
  sessionProto.protocol_handlers.method = function(msg, unblock) {
    currentlyProcessingDDPMessage[this.id] = msg;
    //add context
    Apm._setInfo(msg.__apmInfo);
    msg.__apmInfo = null;

    NotificationManager.methodTrackEventEnd(msg._waitEventId, 'wait');

    return originalMethodHandler.call(this, msg, unblock);
  };

  //to capture the currently processing message
  var orginalSubHandler = sessionProto.protocol_handlers.sub;
  sessionProto.protocol_handlers.sub = function(msg, unblock) {
    currentlyProcessingDDPMessage[this.id] = msg;
    return orginalSubHandler.call(this, msg, unblock);
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
      var apmInfo = Apm._getInfo();
      if(msg.error) {
        var error = msg.error;

        //pick the error from the __apmInfo if setted with 
        //DDPServer._CurrentWriteFence.withValue hijack
        if(apmInfo && apmInfo.currentError) {
          error = apmInfo.currentError;
        }
        error = _.pick(error, ['message', 'stack']);

        NotificationManager.methodEndLastEvent();
        NotificationManager.methodTrackEvent('error', {error: error});
      } else {
        NotificationManager.methodTrackEvent('complete');
      }

      if(apmInfo) {
        //processing the message
        Apm.models.methods.processMethod(apmInfo.method);

        //clean and make sure, fiber is clean
        //not sure we need to do this, but a preventive measure
        Apm._setInfo(null);
      }
    }

    return originalSend.call(this, msg);
  };
};

//We need this hijack to get the correct exception from the method
//otherwise, what we get from the session.send is something customized for the client

var originalWithValue = DDPServer._CurrentWriteFence.withValue;
DDPServer._CurrentWriteFence.withValue = function(value, func) {
  try {
    return originalWithValue.call(DDPServer._CurrentWriteFence, value, func);
  } catch(ex) {
    if(Apm._getInfo()) {
      Apm._getInfo().currentError = ex;
    }
    throw ex;
  }
};
