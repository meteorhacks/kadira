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
        // meteor may or may not run behind a proxy
        var ip = socket.headers['x-forwarded-for'] || socket.remoteAddress;
        msg._isLocalhost = isLocalAddress(ip);

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

var isLocalRegexArray = [
  /^(?:127)(?:\.[0-9]{1,3}){3}$/,
  /^192\.168(?:\.[0-9]{1,3}){2}$/,
  /^10(?:\.[0-9]{1,3}){3}$/,
  /^172\.(?:1[6-9]|2[0-9]|3[0-1])(?:\.[0-9]{1,3}){2}$/
];

function isLocalAddress (address) {
  for(var i = 0; i < isLocalRegexArray.length; ++i) {
    if(isLocalRegexArray[i].test(address)) {
      return true;
    }
  }
}
