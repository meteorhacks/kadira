
Tinytest.add(
  'Models - System - buildPayload',
  function (test) {
    var beforeTime = (new Date).getTime();
    var model = new SystemModel();
    Meteor._wrapAsync(function(callback) {
      setTimeout(callback, 1000);
    })();
    var payload = model.buildPayload().systemMetrics[0];

    test.isTrue(payload.memory > 0);
    test.isTrue(payload.pcpu >= 0);
    test.isTrue(payload.sessions >= 0);
    test.isTrue(payload.endTime >= payload.startTime + 1000);
  }
);

Tinytest.add(
  'Models - System - new Sessions - a new session',
  function (test) {
    var model = new SystemModel();
    model.handleSessionActivity({msg: 'connect'}, 'the-new-id');
    test.equal(model.newSessions, 1);
  }
);

Tinytest.add(
  'Models - System - new Sessions - multiple sessions',
  function (test) {
    var model = new SystemModel();
    model.handleSessionActivity({msg: 'connect'}, Random.id());
    model.handleSessionActivity({msg: 'connect'}, Random.id());
    test.equal(model.newSessions, 2);
  }
);

Tinytest.add(
  'Models - System - new Sessions - reconnecting',
  function (test) {
    var model = new SystemModel();
    model.handleSessionActivity({msg: 'connect'}, 'the-new-id');
    model.handleSessionActivity({msg: 'connect', session: 'the-new-id'}, Random.id());
    model.handleSessionActivity({msg: 'connect', session: 'the-new-id'}, Random.id());
    test.equal(model.newSessions, 1);
  }
);

Tinytest.add(
  'Models - System - new Sessions - reconnecting twice',
  function (test) {
    var model = new SystemModel();
    model.handleSessionActivity({msg: 'connect'}, 'the-new-id');
    model.handleSessionActivity({msg: 'connect', session: 'the-new-id'}, 'the-id-2');
    model.handleSessionActivity({msg: 'connect', session: 'the-id-2'}, 'the-id-3');
    test.equal(model.newSessions, 1);
  }
);

Tinytest.add(
  'Models - System - new Sessions - inactive ddp client',
  function (test) {
    var model = new SystemModel();
    model.handleSessionActivity({msg: 'connect'}, 'the-new-id');
    model.handleSessionActivity({msg: 'sub'}, 'the-new-id');
    model.sessionTimeout = 100;
    
    Wait(200);
    model.handleSessionActivity({msg: 'sub'}, 'the-new-id');
    test.equal(model.newSessions, 2);
  }
);

Tinytest.add(
  'Models - System - new Sessions - active ddp client',
  function (test) {
    var model = new SystemModel();
    model.handleSessionActivity({msg: 'connect'}, 'the-new-id');
    model.handleSessionActivity({msg: 'sub'}, 'the-new-id');
    model.sessionTimeout = 100;

    Wait(50);
    model.handleSessionActivity({msg: 'sub'}, 'the-new-id');
    test.equal(model.newSessions, 1);
  }
);

Tinytest.add(
  'Models - System - new Sessions - timeout a session',
  function (test) {
    var model = new SystemModel();
    model.sessionTimeout = 100;
    model.handleSessionActivity({msg: 'connect'}, 'the-new-id');
    model.handleSessionActivity({msg: 'sub'}, 'the-new-id');

    Wait(150);
    test.equal(_.keys(model._sessionMap).length, 0);
  }
);

Tinytest.add(
  'Models - System - new Sessions - timeout session and reactive',
  function (test) {
    var model = new SystemModel();
    model.sessionTimeout = 100;
    model.handleSessionActivity({msg: 'connect'}, 'the-new-id');
    model.handleSessionActivity({msg: 'sub'}, 'the-new-id');

    Wait(50);
    model.handleSessionActivity({msg: 'sub'}, 'the-new-id');
    test.equal(_.keys(model._sessionMap).length, 1);

    Wait(80);
    test.equal(_.keys(model._sessionMap).length, 1);

    Wait(80)
    test.equal(_.keys(model._sessionMap).length, 0);
  }
);