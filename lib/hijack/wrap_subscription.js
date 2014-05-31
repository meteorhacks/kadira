var Fiber = Npm.require('fibers');

wrapSubscription = function(subscriptionProto) {
  // If the ready event runs outside the Fiber, Kadira._getInfo() doesn't work.
  // we need some other way to store apmInfo so we can use it at ready hijack.
  var originalRunHandler = subscriptionProto._runHandler;
  subscriptionProto._runHandler = function() {
    var apmInfo = Kadira._getInfo();
    if (apmInfo) {
      this.__apmInfo = apmInfo;
    };
    originalRunHandler.call(this);
  }

  var originalReady = subscriptionProto.ready;
  subscriptionProto.ready = function() {
    // meteor has a field called `_ready` which tracks this
    // but we need to make it future proof
    if(!this._apmReadyTracked) {
      var apmInfo = Kadira._getInfo() || this.__apmInfo;
      delete this.__apmInfo;
      //sometime .ready can be called in the context of the method
      //then we have some problems, that's why we are checking this
      //eg:- Accounts.createUser
      if(apmInfo && this._subscriptionId == apmInfo.trace.id) {
        var isForced = Kadira.tracer.endLastEvent(apmInfo.trace);
        if (isForced) {
          console.warn('APM endevent forced complete', JSON.stringify(apmInfo.trace.events));
        };
        Kadira.tracer.event(apmInfo.trace, 'complete');
        var trace = Kadira.tracer.buildTrace(apmInfo.trace);
      }

      Kadira.models.pubsub._trackReady(this._session, this, trace);
      this._apmReadyTracked = true;
    }

    // we still pass the control to the original implementation
    // since multiple ready calls are handled by itself
    originalReady.call(this);
  };

  var originalError = subscriptionProto.error;
  subscriptionProto.error = function(err) {
    var apmInfo = Kadira._getInfo();

    if(apmInfo && this._subscriptionId == apmInfo.trace.id) {
      Kadira.tracer.endLastEvent(apmInfo.trace);

      var errorForApm = _.pick(err, 'message', 'stack');
      Kadira.tracer.event(apmInfo.trace, 'error', {error: errorForApm});
      var trace = Kadira.tracer.buildTrace(apmInfo.trace);
    }

    Kadira.models.pubsub._trackError(this._session, this, trace);
    originalError.call(this, err);
  };

  var originalDeactivate = subscriptionProto._deactivate;
  subscriptionProto._deactivate = function() {
    Kadira.models.pubsub._trackUnsub(this._session, this);
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
        Kadira.env.currentSub.withValue(self, function() {
          return originalFunc.call(self, collectionName, id, fields);
        });
      }
    };
  });
};
