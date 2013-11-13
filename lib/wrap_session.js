var Fibers = Npm.require('fibers');

wrapSession = function(sessionProto) {
  //adding the method context to the current fiber
  //track the start of the method
  var originalMethodHandler = sessionProto.protocol_handlers.method;
  sessionProto.protocol_handlers.method = function(msg, unblock) {
    //add context
    Fibers.current.__apmInfo = {
      session: this.id,
      userId: this.userId,
      method: {
        name: msg.method,
        id: msg.id
      }
    };

    NotificationManager.methodStart();

    originalMethodHandler.call(this, msg, unblock);
  };

  //track method ending (to get the result of error)
  var originalSend = sessionProto.send;
  sessionProto.send = function(msg) {
    if(msg.msg == 'result') {
      if(msg.error) {
        NotificationManager.methodErrored(msg.error);
      } else if(msg.result) {
        NotificationManager.methodCompleted();
      }
    }

    originalSend.call(this, msg);
  };
};