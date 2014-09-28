var logger = Npm.require('debug')('kadira:hijack:session');

Kadira._startInstrumenting = function(callback) {
  //instrumenting session
  var fakeSocket = {send: function() {}, close: function() {}, headers: []};
  var ddpConnectMessage = {msg: 'connect', version: 'pre1', support: ['pre1']};
  Meteor.default_server._handleConnect(fakeSocket, ddpConnectMessage);

  if(fakeSocket._meteorSession) { //for newer meteor versions
    wrapSession(fakeSocket._meteorSession.constructor.prototype);

    //instrumenting subscription
    instrumentSubscription(fakeSocket._meteorSession);

    if(Meteor.default_server._removeSession) {
      //0.8.x
      fakeSocket._meteorSession.close();
    } else if(Meteor.default_server._closeSession) {
      //0.7.x
      Meteor.default_server._closeSession(fakeSocket._meteorSession);
    } else if(Meteor.default_server._destroySession) {
      //0.6.6.x
      Meteor.default_server._destroySession(fakeSocket._meteorSession);
    }

    wrapObservers();
    callback();
  } else if(fakeSocket.meteor_session) { //support for 0.6.5.x
    wrapSession(fakeSocket.meteor_session.constructor.prototype);

    //instrumenting subscription
    instrumentSubscription(fakeSocket.meteor_session);

    fakeSocket.meteor_session.detach(fakeSocket);
    wrapObservers();
    callback();
  } else {
    console.error('Kadira: session instrumenting failed');
  }
};

function instrumentSubscription(session) {
  var subId = Random.id();
  var publicationHandler = function() {this.ready()};
  var pubName = '__kadira_pub';

  session._startSubscription(publicationHandler, subId, [], pubName);
  var subscription = session._namedSubs[subId];
  wrapSubscription(subscription.constructor.prototype);

  //cleaning up
  session._stopSubscription(subId);
}

function wrapObservers() {
  var coll = new Meteor.Collection('kadira_coll_to_wrap_observers');
  var oplogDriver = getObserveDriver(coll.find({}));
  // make sure, this is the oplog driver for sure
  if(oplogDriver && typeof oplogDriver.constructor.cursorSupported == 'function') {
    wrapOplogObserveDriver(oplogDriver.constructor.prototype);
  }

  var pollingDriver = getObserveDriver(coll.find({}, {limit: 20, _disableOplog: true}));
  // make sure, this is the polling driver for sure
  if(pollingDriver && typeof pollingDriver.constructor.cursorSupported == 'undefined') {
    wrapPollingObserveDriver(pollingDriver.constructor.prototype);
  }

  var multiplexer = getMultiplexer(coll.find({}));
  if(multiplexer) {
    wrapMultiplexer(multiplexer.constructor.prototype);
  }

  function getObserveDriver(cursor) {
    var multiplexer = getMultiplexer(cursor);
    if(multiplexer && multiplexer._observeDriver) {
      return multiplexer._observeDriver;
    }
  }

  function getMultiplexer(cursor) {
    var handler = cursor.observeChanges({added: function() {}});
    handler.stop();
    return handler._multiplexer;
  }
}
