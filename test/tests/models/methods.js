var assert = require('assert');

suite('Methods Model', function() {
  test('buildPayload - simple', function(done, server) {
    server.evalSync(createMethodCompleted, 'aa', 'hello', 1, 100, 5);
    server.evalSync(createMethodCompleted, 'aa', 'hello', 2, 800 , 10);

    var payload = server.evalSync(function() {
      emit('return', model.buildPayload());
    });

    assert.deepEqual(payload, {
      methodRequests: [],
      methodMetrics: [
        {
          startTime: 100,
          methods: {
            hello: {
              count: 2,
              errors: 0,
              wait: 0,
              db: 0,
              http: 0,
              email: 0,
              async: 0,
              compute: 7.5,
              total: 7.5
            }
          },
          endTime: 800
        }
      ]
    });
    done();
  });

  test('buildPayload - with errors', function(done, server) {
    server.evalSync(createMethodCompleted, 'aa', 'hello', 1, 100, 5);
    server.evalSync(createMethodErrored, 'aa', 'hello', 2, 'the-error', 800, 10);
    var payload = server.evalSync(function() {
      var payload = model.buildPayload();
      emit('return', payload);
    });

    assert.deepEqual(payload.methodMetrics, [
      {
        startTime: 100,
        methods: {
          hello: {
            count: 2,
            errors: 1,
            wait: 0,
            db: 0,
            http: 0,
            email: 0,
            async: 0,
            compute: 7.5,
            total: 7.5
          }
        },
        endTime: 800
      }
    ]);

    assert.equal(payload.methodRequests[0]._id, "aa::2");
    assert.equal(payload.methodRequests[0].type, "error");
    assert.equal(payload.methodRequests.length, 1);
    done();
  });

  test('buildPayload - max min', function(done, server) {
    server.evalSync(function() {
      model = new MethodsModel();
      model.sendMaxMinInterval = 2;
      emit('return');
    });

    server.evalSync(createMethodCompleted, 'aa', 'hello', 1, 100, 5);
    server.evalSync(createMethodCompleted, 'aa', 'hello', 2, 800 , 15);

    var payload1 = server.evalSync(getPayload);
    assert.deepEqual(payload1.methodRequests, []);

    server.evalSync(createMethodCompleted, 'aa', 'hello', 3, 900 , 2000);
    var lastMethodId = 3;
    var expectedResult = {
      total: {_id: 'aa::3', total: 2000}
    };

    ['wait', 'http', 'db', 'email', 'async'].forEach(function(eventType) {
      server.evalSync(createMethodWithEvent, 'aa', 'hello', ++lastMethodId, 800 , eventType, 1000);
      expectedResult[eventType] = {_id: 'aa::' + lastMethodId};
      expectedResult[eventType][eventType] = 1000;
      server.evalSync(createMethodWithEvent, 'aa', 'hello', ++lastMethodId, 800 , eventType, 10);
    });

    var payload2 = server.evalSync(getPayload);  
    assert.equal(payload2.methodRequests.length, 6);
    
    var processedResult = {};
    payload2.methodRequests.forEach(function(method) {
      processedResult[method.event] = pick(method, ['_id', method.event]);
    });

    assert.deepEqual(processedResult, expectedResult);
    done();
  });

  test('buildPayload - max min - multi-methods', function(done, server) {
    server.evalSync(function() {
      model = new MethodsModel();
      model.sendMaxMinInterval = 2;
      emit('return');
    });

    server.evalSync(createMethodCompleted, 'aa', 'hello', 1, 100, 5);
    server.evalSync(createMethodCompleted, 'aa', 'hello', 2, 800 , 15);

    var payload1 = server.evalSync(getPayload);
    assert.deepEqual(payload1.methodRequests, []);

    server.evalSync(createMethodCompleted, 'aa', 'hello', 3, 900 , 2000);
    server.evalSync(createMethodCompleted, 'aa', 'hi', 200, 900 , 2000);
    var lastMethodId = 3;
    var expectedResult = {
      "hello::total": {_id: 'aa::3', total: 2000},
      "hi::total": {_id: 'aa::200', total: 2000},
    };

    ['hello', 'hi'].forEach(function(methodName) {
      ['wait', 'http', 'db', 'email', 'async'].forEach(function(eventType) {
        server.evalSync(createMethodWithEvent, 'aa', methodName, ++lastMethodId, 800 , eventType, 1000);

        var id = methodName + "::" + eventType;
        expectedResult[id] = {_id: 'aa::' + lastMethodId};
        expectedResult[id][eventType] = 1000;

        server.evalSync(createMethodWithEvent, 'aa', methodName, ++lastMethodId, 800 , eventType, 10);
      });
    });

    var payload2 = server.evalSync(getPayload);  
    assert.equal(payload2.methodRequests.length, 12);
    
    var processedResult = {};
    payload2.methodRequests.forEach(function(method) {
      var id = method.name + "::" + method.event;
      processedResult[id] = pick(method, ['_id', method.event]);
    });

    assert.deepEqual(processedResult, expectedResult);
    done();
  });
});

function getPayload() {
  emit('return', model.buildPayload());
}

function createMethodCompleted(sessionName, methodName, methodId, startTime, methodDelay) {
  if(typeof model == 'undefined') {
    model = new MethodsModel();
  }

  methodDelay = methodDelay || 5;
  var method = model.getMethod({session: sessionName, method: {name: methodName, id: methodId}});
  method.events.push({type: 'start', at: startTime});
  method.events.push({type: 'complete', at: startTime + methodDelay});

  emit('return');
}

function createMethodWithEvent(sessionName, methodName, methodId, startTime, eventName, eventDelay) {
  var time = startTime;

  var method = model.getMethod({session: sessionName, method: {name: methodName, id: methodId}});
  method.events.push({type: 'start', at: time});
  method.events.push({type: eventName, at: time += 5});
  method.events.push({type: eventName + 'end', at: time += eventDelay});
  method.events.push({type: 'complete', at: time += 5});

  emit('return');
}

function createMethodErrored(sessionName, methodName, methodId, errorMessage, startTime, methodDelay) {
  if(typeof model == 'undefined') {
    model = new MethodsModel();
  }

  methodDelay = methodDelay || 5;
  var method = model.getMethod({session: sessionName, method: {name: methodName, id: methodId}});
  method.events.push({type: 'start', at: startTime});
  method.events.push({type: 'error', at: startTime + methodDelay, data: {error: errorMessage}});

  emit('return');
}

function prettyPrint(doc) {
  console.log(JSON.stringify(doc, null, 2));
}

function pick(doc, fields) {
  var newDoc = {};
  fields.forEach(function(field) {
    newDoc[field] = doc[field];
  });
  return newDoc;
}