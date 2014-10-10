
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
  'Models - System - new Sessions - ignore local sessions',
  function (test) {
    var model = new SystemModel();
    model.handleSessionActivity({msg: 'connect', _isLocalhost: true}, 'id');
    test.equal(model.newSessions, 0);
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

Tinytest.add(
  'Models - System - new Sessions - integration - new connections',
  function (test) {
    var model = Kadira.models.system;
    var initCount = model.newSessions;

    sendConnectMessage({remoteAddress: '1.1.1.1'});
    sendConnectMessage({remoteAddress: '1.1.1.1'});

    Wait(100);
    var newSessions = model.newSessions - initCount;
    test.equal(newSessions, 2);
  }
);

Tinytest.add(
  'Models - System - new Sessions - integration - reconnect',
  function (test) {
    var model = Kadira.models.system;
    var initCount = model.newSessions;

    var sessionId = sendConnectMessage({remoteAddress: '1.1.1.1'});
    Wait(50);
    sendConnectMessage({remoteAddress: '1.1.1.1', sessionId: sessionId});
    Wait(50);

    var newSessions = model.newSessions - initCount;
    test.equal(newSessions, 1);
  }
);

Tinytest.add(
  'Models - System - new Sessions - integration - local connection',
  function (test) {
    var model = Kadira.models.system;
    var initCount = model.newSessions;

    sendConnectMessage({remoteAddress: '127.0.0.1'});
    sendConnectMessage({forwardedAddress: '127.0.0.1'});

    Wait(100);
    var newSessions = model.newSessions - initCount;
    test.equal(newSessions, 0);
  }
);

function sendConnectMessage (options) {
  var socket = {send: function() {}, close: function() {}, headers: []};
  if(options.remoteAddress)
    socket.remoteAddress = options.remoteAddress;
  if(options.forwardedAddress)
    socket.headers['x-forwarded-for'] = options.forwardedAddress;

  var message = {msg: 'connect', version: 'pre1', support: ['pre1']};
  if(options.sessionId)
    message.session = options.sessionId;

  var session = null;
  var _originalOnConnection = Meteor.onConnection;
  Meteor.onConnection = function (cb) {
    return _originalOnConnection(function (s) { session = s; cb(s); });
  }

  Meteor.default_server._handleConnect(socket, message);
  Meteor.onConnection = _originalOnConnection;
  return session.id;
}
