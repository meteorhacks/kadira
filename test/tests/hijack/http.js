var assert = require('assert');
var http = require('http');

suite('Hijack - HTTP', function() {
  test('call some server', function(done, server, client) {
    EnableTrackingMethods(server);
    server.evalSync(function() {
      app = Npm.require('http').createServer(function(req, res) {
        res.writeHead(200);
        res.end('hello');
      });
      app.listen(4249, function() {
        emit('return');
      });
    });

    server.evalSync(function() {
      Meteor.methods({
        'http': function() {
          var result = HTTP.get('http://localhost:4249');
          return result.statusCode;
        }
      });

      emit('return');
    });

    var statusCode = callMethod(client, 'http');
    assert.equal(statusCode, 200);

    var events = GetLastMethodEvents(server, [0, 2]);
    events = CleanComputes(events);
    assert.deepEqual(events, [
      ['start',,{userId: null, params: '[]'}],
      ['wait',,{waitOn: []}],
      ['http',,{url: "http://localhost:4249", method: "GET", statusCode: 200}],
      ['complete']
    ]);

    server.evalSync(function() {
      app.close(function() {
        emit('return');
      });
    });

    done();

  });

  test('with the asyncCallback', function(done, server, client) {
    EnableTrackingMethods(server);
    server.evalSync(function() {
      app = Npm.require('http').createServer(function(req, res) {
        res.writeHead(200);
        res.end('hello');
      });
      app.listen(4249, function() {
        emit('return');
      });
    });

    server.evalSync(function() {
      Meteor.methods({
        'http': function() {
          var Future = Npm.require('fibers/future');
          var f = new Future();
          var result;
          HTTP.get('http://localhost:4249', function(err, res) {
            result = res;
            f.return();
          });
          f.wait();
          return result.statusCode;
        }
      });

      emit('return');
    });

    var statusCode = callMethod(client, 'http');
    assert.equal(statusCode, 200);

    var events = GetLastMethodEvents(server, [0, 2]);
    events = CleanComputes(events);
    assert.deepEqual(events, [
      ['start',,{userId: null, params: '[]'}],
      ['wait',,{waitOn: []}],
      ['http',,{url: "http://localhost:4249", method: "GET", async: true}],
      ['async',, {}],
      ['complete']
    ]);

    server.evalSync(function() {
      app.close(function() {
        emit('return');
      });
    });

    done();

  });
});