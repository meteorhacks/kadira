var logger = Npm.require('debug')('kadira:hijack:session');

Kadira._startInstrumenting = function(callback) {
  //instrumenting session
  wrapServer(MeteorX.Server.prototype);
  wrapSession(MeteorX.Session.prototype);
  wrapSubscription(MeteorX.Subscription.prototype);

  // systems without oplog supoprt can exist
  if(MeteorX.MongoOplogDriver) {
    wrapOplogObserveDriver(MeteorX.MongoOplogDriver.prototype);
  }

  wrapPollingObserveDriver(MeteorX.MongoPollingDriver.prototype);
  wrapMultiplexer(MeteorX.Multiplexer.prototype);
  callback();
};
