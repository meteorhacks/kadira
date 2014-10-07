wrapServer = function(serverProto) {
  var originalHandleConnect = serverProto._handleConnect
  serverProto._handleConnect = function(socket, msg) {
    var session = null;
    var handler = Meteor.onConnection(function(s) {
      session = s;
    });

    originalHandleConnect.call(this, socket, msg);
    handler.stop();

    if(session && Kadira.connected) {
      // a way to track session usage
      Kadira.models.system.handleSessionActivity(msg, session.id);
    }
  };
};