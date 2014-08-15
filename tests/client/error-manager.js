
Tinytest.add(
  'Client Side - Error Manager - track an error',
  function (test) {
    Kadira.errors = {};
    Kadira.trackError({name: Meteor.uuid(), count: 1});
    test.equal(_.values(Kadira.errors).length, 1);
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
