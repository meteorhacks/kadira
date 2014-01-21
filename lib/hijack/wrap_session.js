var Fibers = Npm.require('fibers');
//only method, sub and unsub are valid messages
//so following fields would only required
var WAITON_MESSAGE_FIELDS = ['msg', 'id', 'method', 'name'];

wrapSession = function(sessionProto) {

  var currentlyProcessingDDPMessage;

  var originalProcessMessage = sessionProto.processMessage;
  sessionProto.processMessage = function(msg) {
    var apmInfo = {
      session: this.id,
      userId: this.userId
    };

    if(msg.msg == 'method') {
      apmInfo.method = {
        name: msg.method,
        id: msg.id
      };
      msg.__apmInfo = apmInfo;

      var waitOnMessages = this.inQueue.map(function(msg) {
        return _.pick(msg, WAITON_MESSAGE_FIELDS);
      });

      //add currently processing ddp message if exists
      if(this.workerRunning) {
        waitOnMessages.unshift(_.pick(currentlyProcessingDDPMessage, WAITON_MESSAGE_FIELDS));
      }

      NotificationManager.methodTrackEvent('start', null, apmInfo);
      NotificationManager.methodTrackEvent('wait', {waitOn: waitOnMessages}, apmInfo);
    }

    return originalProcessMessage.call(this, msg);
  };

  //adding the method context to the current fiber
  var originalMethodHandler = sessionProto.protocol_handlers.method;
  sessionProto.protocol_handlers.method = function(msg, unblock) {
    currentlyProcessingDDPMessage = msg;
    //add context
    Fibers.current.__apmInfo = msg.__apmInfo;

    NotificationManager.methodTrackEvent('waitend');

    return originalMethodHandler.call(this, msg, unblock);
  };

  //to capture the currently processing message
  var orginalSubHandler = sessionProto.protocol_handlers.sub;
  sessionProto.protocol_handlers.sub = function(msg, unblock) {
    currentlyProcessingDDPMessage = msg;
    return orginalSubHandler.call(this, msg, unblock);
  };

  //to capture the currently processing message
  var orginalUnSubHandler = sessionProto.protocol_handlers.unsub;
  sessionProto.protocol_handlers.unsub = function(msg, unblock) {
    currentlyProcessingDDPMessage = msg;
    return orginalUnSubHandler.call(this, msg, unblock);
  };

  //track method ending (to get the result of error)
  var originalSend = sessionProto.send;
  sessionProto.send = function(msg) {
    if(msg.msg == 'result') {
      if(msg.error) {
        var error = {
          message: msg.error.message,
          stack: msg.error.stack
        };
        NotificationManager.methodTrackEvent('error', {error: error});
      } else {
        NotificationManager.methodTrackEvent('complete');
      }
    }

    return originalSend.call(this, msg);
  };
};