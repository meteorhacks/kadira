Meteor.methods({
  '__hijackSession': function() {
    var sessions = Meteor.server.sessions;
    for(var id in sessions) {
      var session = sessions[id];

      //if called __hijackSession even after the hijack is completed
      if(session.__apkOk) {
        return;
      }

      sessionProto = session.constructor.prototype;
      //do the wrapping
      wrapSession(sessionProto);

      console.log('Meteor APM Initialized!');
      session.__apkOk = true;
    }
  }
});

Meteor.startup(function() {
  var conn = DDP.connect('http://localhost:' + process.env.PORT);
  conn.call('__hijackSession', function() {
    conn.disconnect();
  });
});
