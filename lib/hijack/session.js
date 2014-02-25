var logger = Npm.require('debug')('apm:hijack:session');

Meteor.methods({
  '__apm-hijackSession': function() {
    var sessions = Meteor.server.sessions;
    for(var id in sessions) {
      var session = sessions[id];

      var sessionProto = session.constructor.prototype;
      //if called __hijackSession even after the hijack is completed
      if(sessionProto.__apkOk) {
        return;
      }
      wrapSession(sessionProto);

      //pick the subscriptionProto and wrapIt
      for(var sessionId in Meteor.default_server.sessions) {
        var session = Meteor.default_server.sessions[sessionId];
        var subId = _.keys(session._namedSubs)[0];
        if(subId) {
          var subscriptionProto = session._namedSubs[subId].constructor.prototype;
          wrapSubscription(subscriptionProto);
        }
      }

      logger('hijacking completed');
      sessionProto.__apkOk = true;
    }
  }
});

Meteor.publish('__amp-hijackSubscription', function() {
  this.added('___apm_fake_coll1', 'one', {aa: 10});
  this.ready();
});

Apm._startInstrumenting = function(callback) {
  logger('calling __apm-hijackSession');
  var conn = DDP.connect('http://localhost:' + process.env.PORT);
  conn.subscribe('__amp-hijackSubscription', {
    onReady: callHijack,
    onError: displayError
  });

  function callHijack() {
    conn.call('__apm-hijackSession', function() {
      if(callback) callback();
      conn.disconnect();
    });
  }

  function displayError (err) {
    console.error('APM: something wrong hijacking the subscription: ', err.message); 
  }
};