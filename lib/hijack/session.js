var logger = Npm.require('debug')('apm:hijack:session');

Apm._startInstrumenting = function(callback) {
  //instrumenting session
  var fakeSocket = {send: function() {}, close: function() {}, headers: []};
  var ddpConnectMessage = {msg: 'connect', version: 'pre1', support: ['pre1']};
  Meteor.default_server._handleConnect(fakeSocket, ddpConnectMessage);

  if(fakeSocket._meteorSession) { //for newer meteor versions
    wrapSession(fakeSocket._meteorSession.constructor.prototype);

    //instrumenting subscription
    var subId = Random.id();
    fakeSocket._meteorSession._startSubscription(
      function() {this.ready()}, subId, [], '__apm_pub');
    var subscription= fakeSocket._meteorSession._namedSubs[subId];
    wrapSubscription(subscription.constructor.prototype);

    //cleaning up
    fakeSocket._meteorSession._stopSubscription(subId);
    Meteor.default_server._closeSession(fakeSocket._meteorSession);
    callback();
  } else if(fakeSocket.meteor_session) { //support for 0.6.5.x
    wrapSession(fakeSocket.meteor_session.constructor.prototype);

    //cleaning up
    fakeSocket.meteor_session.detach(fakeSocket);
    callback();
  } else {
    console.error('APM: session instrumenting failed');
  }
};