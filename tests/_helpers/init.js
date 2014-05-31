Kadira.connect('foo', 'bar');

Npm.require('http').createServer(function(req, res) {
  res.writeHead(200);
  res.end('hello');
}).listen(3301);

// TODO use RegisterPublication instead of these

Meteor.publish('tinytest-data', function() {
  return TestData.find();
});

Meteor.publish('tinytest-data-2', function() {
  return TestData.find();
});

Meteor.publish('tinytest-data-delayed', function() {
  Meteor._wrapAsync(function(done) {
    setTimeout(done, 200);
  })();
  return TestData.find();
});

(function () {
  var doneOnce = false;
  Meteor.publish('tinytest-data-multi', function() {
    var pub = this;
    Meteor._wrapAsync(function(done) {
      setTimeout(function() {
        if(!doneOnce) {
          pub.ready();
          doneOnce = true;
          setTimeout(function() {
            pub.ready();
          }, 500);
        }
      }, 400);
    })();
  });
})();

(function () {
  var original = Kadira.models.methods.processMethod;
  Kadira.models.methods.processMethod = function(method) {
    MethodStore.push(method);
    original.call(Kadira.models.methods, method);
  };
})();