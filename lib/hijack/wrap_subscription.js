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
      return Apm.env.currentSub.withValue(this, function() {
        return originalFunc.call(self, collectionName, id, fields);
      });
    };
  });
};