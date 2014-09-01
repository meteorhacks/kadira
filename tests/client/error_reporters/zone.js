
Tinytest.addAsync(
  'Client Side - Error Manager - Reporters - zone - setTimeout',
  function (test, next) {
    hijackKadiraSendErrors(mock_KadiraSendErrors);
    test.equal(typeof window.onerror, 'function');
    var message = Meteor.uuid();

    setTimeout(function (argument) {
      throw new Error(message);
    }, 0);

    function mock_KadiraSendErrors(error) {
      test.equal('string', typeof error.appId);
      test.equal('object', typeof error.info);
      test.equal(message, error.name);
      test.equal('client', error.source);
      test.equal(true, Array.isArray(JSON.parse(error.stacks)));
      test.equal('number', typeof error.startTime);
      test.equal('zone', error.type);
      restoreKadiraSendErrors();
      next();
    }
  }
);

//--------------------------------------------------------------------------\\

var original_KadiraSendErrors = Kadira.errors.sendError;

function hijackKadiraSendErrors(mock) {
  Kadira.errors.sendError = mock;
}

function restoreKadiraSendErrors() {
  Kadira.errors.sendError = original_KadiraSendErrors;
}
