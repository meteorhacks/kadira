var originalWrapAsync = Meteor._wrapAsync;
Meteor._wrapAsync = function() {
  var ret = originalWrapAsync.apply(Meteor, arguments);
  return function() {
    var apmInfo = Apm._getInfo();
    var eventId = NotificationManager.methodTrackEvent('async');

    var result = ret.apply(this, arguments);
    
    NotificationManager.methodTrackEventEnd(eventId, 'async', null);
    return result;
  };
};

if(Package.npm) {
  var originalRunSync = Package.npm.Async.runSync;
  Package.npm.Async.runSync = hiJack(originalRunSync);
  var originalMeteorSync = Meteor.sync;
  Meteor.sync = hiJack(originalMeteorSync);

  function hiJack(originalFunc) {
    return function(func) {
      var apmInfo = Apm._getInfo();
      var eventId = NotificationManager.methodTrackEvent('async');

      return originalFunc.call(null, function(done) {
        func(function(err, result) {
          NotificationManager.methodTrackEvent(eventId, 'async', null, apmInfo);
          done(err, result);
        });
      });
    };  
  }
}