
Tinytest.addAsync(
  'Client Side - Error Manager - Reporters - zone - setTimeout',
  function (test, next) {
    hijackPrintStackTrace(mock_printStackTrace);
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
      restorePrintStackTrace();
      next();
      
    }
  }
);

//--------------------------------------------------------------------------\\

var original_printStackTrace = printStackTrace;

function hijackPrintStackTrace(mock) {
  printStackTrace = mock;
}

function restorePrintStackTrace() {
  printStackTrace = original_printStackTrace;
}

function mock_printStackTrace() {
  var o = getCurrentOrigin();
  return [
    '{anonymous}()@'+o+'/packages/zones/assets/bar.js:12:34',
    'funName@'+o+'/packages/zones/assets/bar.js:12:34',
    '{anonymous}()@'+o+'/foo/bar.js:12:34',
    'funName@'+o+'/foo/bar.js:12:34'
  ];
}

var original_KadiraSendErrors = Kadira.errors.sendError;

function hijackKadiraSendErrors(mock) {
  Kadira.errors.sendError = mock;
}

function restoreKadiraSendErrors() {
  Kadira.errors.sendError = original_KadiraSendErrors;
}
