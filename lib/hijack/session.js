var logger = Npm.require('debug')('kadira:hijack:session');

Kadira._startInstrumenting = function(callback) {
  //instrumenting session
  wrapServer(MeteorX.Server.prototype);
  wrapSession(MeteorX.Session.prototype);
  wrapSubscription(MeteorX.Subscription.prototype);

  if(MeteorX.MongoOplogDriver) {
    wrapOplogObserveDriver(MeteorX.MongoOplogDriver.prototype);
  }

  if(MeteorX.MongoPollingDriver) {
    wrapPollingObserveDriver(MeteorX.MongoPollingDriver.prototype);
  }

  if(MeteorX.Multiplexer) {
    wrapMultiplexer(MeteorX.Multiplexer.prototype);
  }

  callback();
};
