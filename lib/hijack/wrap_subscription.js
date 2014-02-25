var Fiber = Npm.require('fibers');

wrapSubscription = function(subscriptionProto) {
  var originalReady = subscriptionProto.ready;
  subscriptionProto.ready = function() {
    Apm.models.pubsub._trackReady(this._session, this);
    originalReady.call(this);
  };

  var originalDeactivate = subscriptionProto._deactivate;
  subscriptionProto._deactivate = function() {
    Apm.models.pubsub._trackUnsub(this._session, this);
    originalDeactivate.call(this);
  };

  //adding the currenSub env variable
  ['added', 'changed', 'removed'].forEach(function(funcName) {
    var originalFunc = subscriptionProto[funcName];
    subscriptionProto[funcName] = function(collectionName, id, fields) {
      var self = this;

      //we need to run this code in a fiber and that's how we track 
      //subscription info. May be we can figure out, some other way to do this
      if(Fiber.current) {
        doCall();
      } else {
        Fiber(doCall).run();
      }

      function doCall() {
        Apm.env.currentSub.withValue(self, function() {
          return originalFunc.call(self, collectionName, id, fields);
        });
      }
    };
  });
};