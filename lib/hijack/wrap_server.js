var Fiber = Npm.require('fibers');

wrapServer = function(serverProto) {
  var originalHandleConnect = serverProto._handleConnect
  serverProto._handleConnect = function(socket, msg) {
    var self = this;
    if(!Kadira.connected) {
      return;
    }

    runInFiber(function() {
      originalHandleConnect.call(self, socket, msg);
      var session = socket._meteorSession;
      session._activeAt = Date.now();
      if(!msg.session) {
        session._activeAt = Date.now();
        Kadira.models.system.countNewSession(session);
      }
    });
  };
};

function runInFiber(f) {
  if(Fiber.current) {
    f();
  } else {
    new Fiber(f).run();
  }
}
