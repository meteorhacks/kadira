var originalWrapAsync = Meteor._wrapAsync;
Meteor._wrapAsync = function() {
  var ret = originalWrapAsync.apply(Meteor, arguments);
  return function() {
    var canTrack = false;
    var apmInfo = Apm._getInfo();
    if(apmInfo) {
      canTrack = NotificationManager.methodTrackEvent('async');
    }
    var result = ret.apply(this, arguments);
    if(canTrack) {
      NotificationManager.methodTrackEvent('asyncend', null);
    }
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
      var canTrack = false;
      if(apmInfo) {
        canTrack = NotificationManager.methodTrackEvent('async');
      }

      return originalFunc.call(null, function(done) {
        func(function(err, result) {
          if(canTrack) {
            NotificationManager.methodTrackEvent('asyncend', null, apmInfo);
          }
          done(err, result);
        });
      });
    };  
  }
}