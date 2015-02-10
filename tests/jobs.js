Tinytest.addAsync(
  'Jobs - get',
  function (test, done) {
    var value = 10;
    var id = 'the-id';

    var newSend = function(payload, path, callback) {
      test.equal(payload, {
        action: 'get',
        params: {id: id}
      });
      test.equal(path, '/jobs');
      callback(null, value);
    };

    WithKadiraSend(newSend, function() {
      var result = Kadira.Jobs.get(id);
      test.equal(result, value);
      done();
    });
  }
);

Tinytest.addAsync(
  'Jobs - set',
  function (test, done) {
    var value = 10;
    var id = 'the-id';

    var newSend = function(payload, path, callback) {
      test.equal(payload, {
        action: 'set',
        params: {id: id, val: value},
      });
      test.equal(path, '/jobs');
      callback(null);
    };

    WithKadiraSend(newSend, function() {
      Kadira.Jobs.set(id, {val: value});
      done();
    });
  }
);

function WithKadiraSend(newFn, fn) {
  var originaSend = Kadira.send;
  Kadira.send = newFn;
  fn();
  Kadira.send = originaSend;
}