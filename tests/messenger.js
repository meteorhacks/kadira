var http = Npm.require('http');

Tinytest.addAsync(
  'Messenger - sendRequest - with correct server',
  function (test, done) {
    var port = getPort();
    var m = new Messenger('app', 'secret', 'http://localhost:' + port);
    var requests = 0;
    var contentType;

    var server = http.createServer(function(req, res) {
      requests++;
      contentType = req.headers['content-type'];
      res.end();
    }).listen(port, function() {
      m.sendRequest('POST', '/', {json: {aa: 20}}, function(err, res, body) {
        WithFiber(function() {
          if(err) throw err;
          test.equal(requests, 1);
          test.equal(contentType, 'application/json');
          test.equal(res.statusCode, 200);
          done();
          server.close();
        });
      });
    });
  }
);

Tinytest.addAsync(
  'Messenger - sendRequest - incorrect server',
  function (test, done) {
    var port = getPort();
    var m = new Messenger('app', 'secret', 'http://localhost:' + port);
    m.sendRequest('POST', '/', {json: {aa: 20}}, function(err, res, body) {
      WithFiber(function() {
        test.equal(err.code, 'ECONNREFUSED');
        done();
      });
    });
  }
);

Tinytest.addAsync(
  'Messenger - recieveMessages - one message',
  function (test, done) {
    var port = getPort();
    var m = new Messenger('app', 'secret', 'http://localhost:' + port);
    m.on('message', function(type, data) {
      WithFiber(function() {
        test.equal(type, 't');
        test.equal(data, {aa: 10});
        done();
      });
    });

    var server = http.createServer(function(req, res) {
      var body = {messages: [{type: 't', data: {aa: 10}}]};
      res.write(JSON.stringify(body));
      res.end();
    }).listen(port, function() {
      m.sendRequest('POST', '/', {json: {aa: 20}}, server.close.bind(server));
    });
  }
);

Tinytest.addAsync(
  'Messenger - recieveMessages - no messages',
  function (test, done) {
    var port = getPort();
    var m = new Messenger('app', 'secret', 'http://localhost:' + port);
    m.on('message', function(type, data) {
      WithFiber(function() {
        test.fail("can't receive messages!");
      });
    });

    var server = http.createServer(function(req, res) {
      res.end();
    }).listen(port, function() {
      m.sendRequest('POST', '/', {json: {aa: 20}}, function() {
        WithFiber(done);
      });
    });
  }
);

Tinytest.addAsync(
  'Messenger - sendMessage',
  function (test, done) {
    var port = getPort();
    var m = new Messenger('app', 'secret', 'http://localhost:' + port);
    m.sendRequest = function(method, path, httpOptions, callback) {
      WithFiber(function() {
        var hostname = Npm.require('os').hostname();
        test.equal(method, 'POST');
        test.equal(path, '/messenger');
        test.equal(httpOptions, {
          json: {
            messages: [
              {type: 'ty', data: {aa: 10}}
            ],
            host: hostname
          }
        });
        callback(null, {statusCode: 200})
        done();
      });
    };
    m.sendMessage('ty', {aa: 10});
  }
);

function getPort() {
  return 12000 + Math.ceil(Math.random() * 3000);
}
