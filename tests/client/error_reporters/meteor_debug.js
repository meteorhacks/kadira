
Tinytest.add(
  'Client Side - Error Manager - Reporters - meteor._debug - with zone',
  function (test) {
    hijackPrintStackTrace(mock_printStackTrace);
    hijackKadiraSendErrors(mock_KadiraSendErrors);
    test.equal(typeof Meteor._debug, 'function');
    var errorSent = false;
    var errorThrown = false;
    var message = Meteor.uuid();

    try {
      Meteor._debug(message, '_stack');
    } catch(e) {
      errorThrown = true;
    };

    test.equal(errorSent, false);
    test.equal(errorThrown, true);
    restoreKadiraSendErrors();
    restorePrintStackTrace();

    function mock_KadiraSendErrors(data) {
      errorSent = true;
    }
  }
);

Tinytest.add(
  'Client Side - Error Manager - Reporters - meteor._debug - without zone',
  function (test) {
    hijackPrintStackTrace(mock_printStackTrace);
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
    restorePrintStackTrace();

    function mock_KadiraSendErrors(data) {
      errorSent = true;
      test.equal(true, Array.isArray(data));
      test.equal(1, data.length);
      var error = data[0];
      test.equal('string', typeof error.appId);
      test.equal('object', typeof error.info);
      test.equal(message, error.name);
      test.equal('client', error.source);
      test.equal(true, Array.isArray(error.stacks));
      test.equal('number', typeof error.startTime);
      test.equal('meteor._debug', error.type);
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

var original_KadiraSendErrors = Kadira.sendErrors;

function hijackKadiraSendErrors(mock) {
  Kadira.sendErrors = mock;
}

function restoreKadiraSendErrors() {
  Kadira.sendErrors = original_KadiraSendErrors;
}
