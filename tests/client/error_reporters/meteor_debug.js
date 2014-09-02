
Tinytest.add(
  'Client Side - Error Manager - Reporters - meteor._debug - with zone',
  TestWithErrorTracking(function (test) {
    hijackKadiraSendErrors(mock_KadiraSendErrors);
    test.equal(typeof Meteor._debug, 'function');
    var errorSent = false;
    var errorThrown = false;
    var message = Meteor.uuid();

    zone.onError = function(e) {
      errorThrown = true;
    };

    Meteor._debug(message, '_stack');
    test.equal(errorSent, false);
    test.equal(errorThrown, true);
    restoreKadiraSendErrors();

    function mock_KadiraSendErrors(data) {
      errorSent = true;
    }
  })
);

Tinytest.add(
  'Client Side - Error Manager - Reporters - meteor._debug - without zone',
  TestWithErrorTracking(function (test) {
    hijackKadiraSendErrors(mock_KadiraSendErrors);
    test.equal(typeof Meteor._debug, 'function');
    var errorSent = false;
    var originalZone = window.zone;
    var message = Meteor.uuid();
    window.zone = undefined;

    try {
      Meteor._debug(message, '_stack');
    } catch(e) {};

    window.zone = originalZone;
    test.equal(errorSent, true);
    restoreKadiraSendErrors();

    function mock_KadiraSendErrors(error) {
      errorSent = true;
      test.equal('string', typeof error.appId);
      test.equal('object', typeof error.info);
      test.equal(message, error.name);
      test.equal('client', error.source);
      test.equal(true, Array.isArray(JSON.parse(error.stacks)));
      test.equal('number', typeof error.startTime);
      test.equal('meteor._debug', error.type);
    }
  })
);

//--------------------------------------------------------------------------\\

var original_KadiraSendErrors;

function hijackKadiraSendErrors(mock) {
  original_KadiraSendErrors = Kadira.errors.sendError;
  Kadira.errors.sendError = mock;
}

function restoreKadiraSendErrors() {
  Kadira.errors.sendError = original_KadiraSendErrors;
}

function TestWithErrorTracking (testFunction) {
  return function (test) {
    var status = Kadira.options.enableErrorTracking;
    Kadira.enableErrorTracking();
    testFunction(test);
    status ? Kadira.enableErrorTracking() : Kadira.disableErrorTracking();
  }
}
