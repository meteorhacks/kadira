var logger = Npm.require('debug')('apm:hijack:session');

Apm._startInstrumenting = function(callback) {
  //instrumenting session
  var fakeSocket = {send: function() {}, close: function() {}, headers: []};
  var ddpConnectMessage = {msg: 'connect', version: 'pre1', support: ['pre1']};
  Meteor.default_server._handleConnect(fakeSocket, ddpConnectMessage);

  if(fakeSocket._meteorSession) { //for newer meteor versions
    wrapSession(fakeSocket._meteorSession.constructor.prototype);

    //instrumenting subscription
    instrumentSubscription(fakeSocket._meteorSession);

    Meteor.default_server._closeSession(fakeSocket._meteorSession);
    callback();
  } else if(fakeSocket.meteor_session) { //support for 0.6.5.x
    wrapSession(fakeSocket.meteor_session.constructor.prototype);

    //instrumenting subscription
    instrumentSubscription(fakeSocket.meteor_session);

    fakeSocket.meteor_session.detach(fakeSocket);
    callback();
  } else {
    console.error('APM: session instrumenting failed');
  }
};

function instrumentSubscription(session) {
  var subId = Random.id();
  var publicationHandler = function() {this.ready()};
  var pubName = '__apm_pub';

  session._startSubscription(publicationHandler, subId, [], pubName);
  var subscription = session._namedSubs[subId];
  wrapSubscription(subscription.constructor.prototype);

  //cleaning up
  session._stopSubscription(subId);
}