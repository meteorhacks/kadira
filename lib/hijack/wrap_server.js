var Fiber = Npm.require('fibers');

wrapServer = function(serverProto) {
  var originalHandleConnect = serverProto._handleConnect
  serverProto._handleConnect = function(socket, msg) {
    var self = this;
    runInFiber(function() {
      var session = null;
      var handler = Meteor.onConnection(function(s) {
        session = s;
      });

      originalHandleConnect.call(self, socket, msg);
      handler.stop();

      if(session && Kadira.connected) {
        // a way to track session usage
        Kadira.models.system.handleSessionActivity(msg, session.id);
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