var originalWrapAsync = Meteor._wrapAsync;
Meteor._wrapAsync = function() {
  var ret = originalWrapAsync.apply(Meteor, arguments);
  return function() {
    var apmInfo = Apm._getInfo();
    if(apmInfo) {
      var eventId = Apm.tracer.event(apmInfo.trace, 'async');
    }

    try{
      var result = ret.apply(this, arguments);
      if(eventId) {
        Apm.tracer.eventEnd(apmInfo.trace, eventId);
      }
      return result;
    } catch(ex) {
      if(eventId) {
        Apm.tracer.eventEnd(apmInfo.trace, eventId, {err: ex.message});
      }
      throw ex;
    }
  };
};

if(Package.npm && Package.npm.Async) {
  var originalRunSync = Package.npm.Async.runSync;
  Package.npm.Async.runSync = hiJack(originalRunSync);
  var originalMeteorSync = Meteor.sync;
  Meteor.sync = hiJack(originalMeteorSync);

  function hiJack(originalFunc) {
    return function(func) {
      var apmInfo = Apm._getInfo();
      if(apmInfo) {
        var eventId = Apm.tracer.event(apmInfo.trace, 'async');
      }

      return originalFunc.call(null, function(done) {
        func(function(err, result) {
          var endData = (err)? {err: err.message} : null;
          if(eventId) {
            Apm.tracer.eventEnd(apmInfo.trace, eventId, endData);
          }
          done(err, result);
        });
      });
    };  
  }
}