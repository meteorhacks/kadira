var Fibers = Npm.require('fibers');

MeteorAPM._wrapSession = function(sessionProto) {
  console.log('wrapping.....');
  //adding the method context to the current fiber
  //track the start of the method
  var originalMethodHandler = sessionProto.protocol_handlers.method;
  sessionProto.protocol_handlers.method = function(msg, unblock) {
    //add context
    Fibers.current.__apmInfo = {
      session: this.id,
      userId: this.userId,
      method: msg.id
    };

    //todo: Track Method Start Time

    originalMethodHandler.call(this, msg, unblock);
  };

  //track method ending (to get the result of error)
  var originalSend = sessionProto.send;
  sessionProto.send = function(msg) {
    if(msg.msg == 'result') {
      if(msg.error) {
        //todo: send the details of the error object with stack trace
        //todo: track the end of the message
      } else if(msg.result) {
        //todo: track the end of the message
      }
    }

    originalSend.call(this, msg);
  };
};