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
          }
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
        }
      }
    ]);
    done();
  });
});

function getPayload(buildDetailInfo) {
  emit('return', model.buildPayload(buildDetailInfo));
}

function createMethodCompleted(sessionName, methodName, methodId, startTime, methodDelay) {
  if(typeof model == 'undefined') {
    model = new MethodsModel();
  }

  methodDelay = methodDelay || 5;
  var method = {session: sessionName, name: methodName, id: methodId, events: []};
  method.events.push({type: 'start', at: startTime});
  method.events.push({type: 'complete', at: startTime + methodDelay});
  method = Apm.tracer.buildTrace(method);
  model.processMethod(method);

  emit('return');
}

function createMethodWithEvent(sessionName, methodName, methodId, startTime, eventName, eventDelay) {
  if(typeof model == 'undefined') {
    model = new MethodsModel();
  }
  var time = startTime;

  var method = {session: sessionName, name: methodName, id: methodId, events: []};
  method.events.push({type: 'start', at: time});
  method.events.push({type: eventName, at: time += 5});
  method.events.push({type: eventName + 'end', at: time += eventDelay});
  method.events.push({type: 'complete', at: time += 5});
  method = Apm.tracer.buildTrace(method);
  model.processMethod(method);

  emit('return');
}

function createMethodErrored(sessionName, methodName, methodId, errorMessage, startTime, methodDelay) {
  if(typeof model == 'undefined') {
    model = new MethodsModel();
  }

  methodDelay = methodDelay || 5;
  var method = {session: sessionName, name: methodName, id: methodId, events: []};
  method.events.push({type: 'start', at: startTime});
  method.events.push({type: 'error', at: startTime + methodDelay, data: {error: errorMessage}});
  method = Apm.tracer.buildTrace(method);
  model.processMethod(method);

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