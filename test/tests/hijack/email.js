var assert = require('assert');

suite('Hijack - Email', function() {
  test('successful send', function(done, server, client) {
    server.evalSync(function() {
      Meteor.methods({
        'send': function() {
          Email.send({from: 'arunoda@meteorhacks.com', from: 'hello@meteor.com'});
        }
      });
      
      emit('return');
    });

    callMethod(client, 'send');

    var events = getLastMethodEvents(server);
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