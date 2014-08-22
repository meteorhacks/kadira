
Tinytest.add(
  'Client Side - Error Manager - track an error',
  function (test) {
    Kadira.errors = {};
    Kadira.trackError({name: Meteor.uuid(), count: 1});
    test.equal(_.values(Kadira.errors).length, 1);
  }
);

Tinytest.add(
  'Client Side - Error Manager - do not send immediately',
  function (test) {
    var originalSend = Kadira.send;
    var errors = [{foo: 'bar'}];
    var errorsSent = false;
    Kadira.syncedDate.synced = false;
    Kadira.send = function (payload) {
      errorsSent = true;
    };
    Kadira.sendErrors(errors);
    test.isFalse(errorsSent);
    Kadira.send = originalSend;
  }
);

Tinytest.addAsync(
  'Client Side - Error Manager - send anyways after 2 seconds',
  function (test, next) {
    var originalSend = Kadira.send;
    var errors = [{foo: 'bar'}];
    var errorsSent = false;
    Kadira.syncedDate.synced = false;
    Kadira.send = function (payload) {
      errorsSent = true;
    };
    Kadira.sendErrors(errors);
    test.isFalse(errorsSent);
    setTimeout(function () {
      test.isTrue(errorsSent);
      Kadira.send = originalSend;
      next();
    }, 1000*3);
  }
);

Tinytest.add(
  'Client Side - Error Manager - send immediately if forced',
  function (test) {
    var originalSend = Kadira.send;
    var errors = [{foo: 'bar'}];
    var errorsSent = false;
    Kadira.syncedDate.synced = false;
    Kadira.send = function (payload) {
      errorsSent = true;
    };
    Kadira.sendErrors(errors, true);
    test.isTrue(errorsSent);
    Kadira.send = originalSend;
  }
);

Tinytest.add(
  'Client Side - Error Manager - send immediately if ntp sync is done',
  function (test) {
    var originalSend = Kadira.send;
    var errors = [{foo: 'bar'}];
    var errorsSent = false;
    Kadira.syncedDate.synced = true;
    Kadira.send = function (payload) {
      errorsSent = true;
    };
    Kadira.sendErrors(errors);
    test.isTrue(errorsSent);
    Kadira.send = originalSend;
  }
);

Tinytest.add(
  'Client Side - Error Manager - automatically send first time',
  function (test) {
    Kadira.errors = {};
    var originalSendErrors = Kadira.sendErrors;
    var errorsSent = 0;
    var message = Meteor.uuid();
    Kadira.sendErrors = function (errors) {
      errorsSent++;
      test.equal(errors.length, 1);
    };
    Kadira.trackError({name: message, count: 1});
    test.equal(_.values(Kadira.errors).length, 1);
    test.equal(errorsSent, 1);
    Kadira.sendErrors = originalSendErrors;
    Kadira.errors = {};
  }
);

Tinytest.add(
  'Client Side - Error Manager - don\'t automatically send duplicates',
  function (test) {
    Kadira.errors = {};
    var originalSendErrors = Kadira.sendErrors;
    var errorsSent = 0;
    var message = Meteor.uuid();
    Kadira.sendErrors = function (errors) {
      errorsSent++;
      test.equal(errors.length, 1);
    };
    Kadira.trackError({name: message, count: 1});
    Kadira.trackError({name: message, count: 1});
    Kadira.trackError({name: message, count: 1});
    test.equal(_.values(Kadira.errors).length, 1);
    test.equal(errorsSent, 1);
    Kadira.sendErrors = originalSendErrors;
    Kadira.errors = {};
  }
);

Tinytest.add(
  'Client Side - Error Manager - send with `sendSavedErrors`',
  function (test) {
    Kadira.errors = {};
    var originalSendErrors = Kadira.sendErrors;
    var errorsSent = 0;
    var message = Meteor.uuid();
    Kadira.trackError({name: message, count: 1});
    Kadira.trackError({name: message, count: 1});
    Kadira.trackError({name: message, count: 1});
    Kadira.sendErrors = function (errors) {
      errorsSent++;
      test.equal(errors.length, 1);
      test.equal(errors[0].count, 2);
    };
    Kadira.sendSavedErrors();
    test.equal(_.values(Kadira.errors).length, 0);
    test.equal(errorsSent, 1);
    Kadira.sendErrors = originalSendErrors;
    Kadira.errors = {};
  }
);

Tinytest.add(
  'Client Side - Error Manager - limit number of errors',
  function (test) {
    var originalSend = Kadira.send;
    Kadira.send = function (payload) {
      var receivedErrors = JSON.parse(payload.errors);
      test.equal(Kadira.options.maxErrorsPerInterval, receivedErrors.length);
    };
    var errors = [];
    for(var i = 20; i-->0;) {
      errors.push({errorNumber: i})
    }
    Kadira.sendErrors(errors);
    Kadira.send = originalSend;
  }
);

Tinytest.add(
  'Client Side - Error Manager - remove function arguments',
  function (test) {
    var originalSend = Kadira.send;
    Kadira.send = function (payload) {
      var receivedErrors = JSON.parse(payload.errors);
      var expected = [{
        stacks: [{
          ownerArgs: ['--- argument is a Function ---'],
          events: [{foo: '--- argument is a Function ---'}],
          info: [{foo: '--- argument is a Function ---'}]
        }]
      }];
      test.equal(expected, receivedErrors);
    };
    Kadira.sendErrors([{
      stacks: [{
        ownerArgs: [Function()],
        events: [{foo: Function()}],
        info: [{foo: Function()}]
      }]
    }]);
    Kadira.send = originalSend;
  }
);

Tinytest.add(
  'Client Side - Error Manager - remove unstringifiable arguments',
  function (test) {
    var originalSend = Kadira.send;
    Kadira.send = function (payload) {
      var receivedErrors = JSON.parse(payload.errors);
      var expected = [{
        stacks: [{
          ownerArgs: ['--- cannot stringify argument ---'],
          events: [{foo: '--- cannot stringify argument ---'}],
          info: [{foo: '--- cannot stringify argument ---'}]
        }]
      }];
      test.equal(expected, receivedErrors);
    };
    var unstringifiable = {};
    unstringifiable.foo = unstringifiable;
    Kadira.sendErrors([{
      stacks: [{
        ownerArgs: [unstringifiable],
        events: [{foo: unstringifiable}],
        info: [{foo: unstringifiable}]
      }]
    }]);
    Kadira.send = originalSend;
  }
);

Tinytest.add(
  'Client Side - Error Manager - remove large arguments',
  function (test) {
    var originalSend = Kadira.send;
    Kadira.send = function (payload) {
      var receivedErrors = JSON.parse(payload.errors);
      var expected = [{
        stacks: [{
          ownerArgs: ['--- argument size exceeds limit ---'],
          events: [{foo: '--- argument size exceeds limit ---'}],
          info: [{foo: '--- argument size exceeds limit ---'}]
        }]
      }];
      test.equal(expected, receivedErrors);
    };
    var large = [];
    for(var i=21; i-->0;) {
      large.push('--------------------------------------------------')
    };
    large = large.join('');
    Kadira.sendErrors([{
      stacks: [{
        ownerArgs: [large],
        events: [{foo: large}],
        info: [{foo: large}]
      }]
    }]);
    Kadira.send = originalSend;
  }
);
