var assert = require('assert');

suite('Hijack - Email', function() {
  test('successful send', function(done, server, client) {
    EnableTrackingMethods(server);
    server.evalSync(function() {
      Meteor.methods({
        'send': function() {
          Email.send({from: 'arunoda@meteorhacks.com', from: 'hello@meteor.com'});
        }
      });
      
      emit('return');
    });

    callMethod(client, 'send');

    var events = GetLastMethodEvents(server);
    assert.deepEqual(events, [
      {type: 'start'},
      {type: 'wait'},
      {type: 'waitend'},
      {type: 'email'},
      {type: 'emailend'},
      {type: 'complete'},
    ]);
    done();
  });
});