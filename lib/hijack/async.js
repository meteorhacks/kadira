var originalWrapAsync = Meteor._wrapAsync;
Meteor._wrapAsync = function() {
  var ret = originalWrapAsync.apply(Meteor, arguments);
  return function() {
    var apmInfo = Apm._getInfo();
    var eventId = NotificationManager.methodTrackEvent('async');

    try{
      var result = ret.apply(this, arguments);
      NotificationManager.methodTrackEventEnd(eventId, 'async', null);
      return result;
    } catch(ex) {
      NotificationManager.methodTrackEventEnd(eventId, 'async', {err: ex.message}); 
      throw ex;
    }
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
          var endData = (err)? {err: err.message} : null;
          NotificationManager.methodTrackEventEnd(eventId, 'async', endData, apmInfo);
          done(err, result);
        });
      });
    };  
  }
}