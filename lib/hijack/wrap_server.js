var Fiber = Npm.require('fibers');

wrapServer = function(serverProto) {
  var originalHandleConnect = serverProto._handleConnect
  serverProto._handleConnect = function(socket, msg) {
    var self = this;
    runInFiber(function() {
      originalHandleConnect.call(self, socket, msg);
      if(Kadira.connected) {
        Kadira.models.system.handleSessionActivity(msg, socket._meteorSession);
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
