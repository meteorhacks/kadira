Tinytest.add(
  'Client Side - Error Model - sends errors', 
  function(test) {
    var em = new KadiraErrorModel();
    var payloadReceived;
    var resetSend = onKadiraSend(function(payload) {
      payloadReceived = payload;
      resetSend();
    });
    em.sendError({name: "hello"});

    test.equal(payloadReceived, {errors: [
      {name: "hello", count: 1}
    ]});
    
    test.equal(em.errorsSent["hello"], {
      name: "hello", count: 0
    });

    em.close();
  }
);

Tinytest.add(
  'Client Side - Error Model - sends same error twice', 
  function(test) {
    var em = new KadiraErrorModel();
    var payloadReceived;
    var resetSend = onKadiraSend(function(payload) {
      payloadReceived = payload;
      resetSend();
    });
    em.sendError({name: "hello"});
    em.sendError({name: "hello"});

    test.equal(payloadReceived, {errors: [
      {name: "hello", count: 1}
    ]});
    
    test.equal(em.errorsSent["hello"], {
      name: "hello", count: 1
    });

    em.close();
  }
);

Tinytest.add(
  'Client Side - Error Model - isErrorExists', 
  function(test) {
    var em = new KadiraErrorModel();
    var payloadReceived;
    var resetSend = onKadiraSend(function(payload) {
      resetSend();
    });
    
    em.sendError({name: "hoo"});
    test.equal(em.isErrorExists("hoo"), true);
    test.equal(em.isErrorExists("no-hoo"), false);

    em.close();
  }
);

Tinytest.add(
  'Client Side - Error Model - increamentErrorCount', 
  function(test) {
    var em = new KadiraErrorModel();
    var payloadReceived;
    var resetSend = onKadiraSend(function(payload) {
      resetSend();
    });
    
    em.sendError({name: "hoo"});
    em.increamentErrorCount("hoo");
    em.increamentErrorCount("hoo");
    
    test.equal(em.errorsSent["hoo"], {
      name: "hoo", count: 2
    });

    em.close();
  }
);

Tinytest.add(
  'Client Side - Error Model - canSendErrors', 
  function(test) {
    var em = new KadiraErrorModel({maxErrorsPerInterval: 2});
    var payloadReceived;
    var resetSend = onKadiraSend(function(payload) {
      resetSend();
    });
    
    em.sendError({name: "hoo"});
    test.equal(em.canSendErrors(), true);
    em.sendError({name: "hoo2"});
    test.equal(em.canSendErrors(), false);

    em.close();
  }
);

Tinytest.addAsync(
  'Client Side - Error Model - validateInterval', 
  function(test, done) {
    var em = new KadiraErrorModel({
      maxErrorsPerInterval: 2,
      intervalInMillis: 200
    });
    
    em.sendError({name: "hoo"});
    em.sendError({name: "hoo2"});

    em.sendError({name: "hoo"});
    em.sendError({name: "hoo2"});
    test.equal(em.canSendErrors(), false);

    var lastPayload;
    var resetSend = onKadiraSend(function(payload) {
      lastPayload = payload;
      resetSend();
    });

    setTimeout(function() {
      test.equal(em.canSendErrors(), true);
      test.equal(lastPayload, {errors: [
        {name: "hoo", count: 1},
        {name: "hoo2", count: 1},
      ]});
      em.close();
      done();
    }, 250);

  }
);

function onKadiraSend(callback) {
  var originalSend = Kadira.send;
  Kadira.send = function(payload) {
    callback(payload);
  };

  return function() {
    Kadira.send = originalSend;
  }
}