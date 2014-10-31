var Fiber = Npm.require('fibers');

wrapServer = function(serverProto) {
  var originalHandleConnect = serverProto._handleConnect
  serverProto._handleConnect = function(socket, msg) {
    var self = this;
    originalHandleConnect.call(self, socket, msg);
    if(Kadira.connected) {
      Kadira.models.system.handleSessionActivity(msg, socket._meteorSession);
    }
  };
};