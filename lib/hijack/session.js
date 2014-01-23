var logger = Npm.require('debug')('apm:hijack:session');

Meteor.methods({
  '__hijackSession': function() {
    var sessions = Meteor.server.sessions;
    for(var id in sessions) {
      var session = sessions[id];

      sessionProto = session.constructor.prototype;
      //if called __hijackSession even after the hijack is completed
      if(sessionProto.__apkOk) {
        return;
      }
      //do the wrapping
      wrapSession(sessionProto);

      logger('hijacking completed');
      sessionProto.__apkOk = true;
    }
  }
});

Meteor.startup(function() {
  logger('calling __hijackSession');
  var conn = DDP.connect('http://localhost:' + process.env.PORT);
  conn.call('__hijackSession', function() {
    conn.disconnect();
  });
});