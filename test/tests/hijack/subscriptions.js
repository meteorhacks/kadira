var assert = require('assert');

suite('Hijack - Subscriptions', function() {
  test('subs and unsubs: only subscribe', function(done, server, client) {
    server.evalSync(function() {
      Posts = new Meteor.Collection('posts');
      Meteor.publish('postsList', function() {
        return Posts.find();
      });
      emit('return');
    });

    client.evalSync(function() {
      Meteor.subscribe('postsList', function() {
        Meteor.subscribe('postsList', function() {
          emit('return');
        });
      }); 
    });

    var metrics = GetPubsubMetrics(server);
    assert.equal(metrics.length, 1);
    assert.equal(metrics[0].pubs.postsList.subs, 2);
    assert.equal(metrics[0].pubs.postsList.unsubs, 0);
    done();
  });

  test('subs and unsubs: subscribe and unsubscribe', function(done, server, client) {
    server.evalSync(function() {
      Posts = new Meteor.Collection('posts');
      Meteor.publish('postsList', function() {
        return Posts.find();
      });
      emit('return');
    });

    client.evalSync(function() {
      var h1 = Meteor.subscribe('postsList', function() {
        var h2 = Meteor.subscribe('postsList', function() {
          h1.stop();
          h2.stop();
          emit('return');
        });
      }); 
    });

    //wait a bit until the server stop the subscription
    Wait(server, 100);

    var metrics = GetPubsubMetrics(server);
    assert.equal(metrics.length, 1);
    assert.equal(metrics[0].pubs.postsList.subs, 2);
    assert.equal(metrics[0].pubs.postsList.unsubs, 2);
    done();
  });

  test('resTime', function(done, server, client) {
    server.evalSync(function() {
      Posts = new Meteor.Collection('posts');
      Meteor.publish('postsList', function() {
        Meteor._wrapAsync(function(done) {
          setTimeout(done, 200);
        })();
        return Posts.find();
      });
      emit('return');
    });

    client.evalSync(function() {
      Meteor.subscribe('postsList', function() {
        emit('return');
      }); 
    });

    var metrics = GetPubsubMetrics(server);
    assert.ok(metrics[0].pubs.postsList.resTime > 200);
    done();
  });

  test('lifeTime', function(done, server, client) {
    server.evalSync(function() {
      Posts = new Meteor.Collection('posts');
      Meteor.publish('postsList', function() {
        return Posts.find();
      });
      emit('return');
    });

    client.evalSync(function() {
      h1 = Meteor.subscribe('postsList', function() {
        emit('return');
      }); 
    });

    Wait(server, 300);
    client.evalSync(function() {
      h1.stop();
      emit('return');
    });

    Wait(server, 100);
    var metrics = GetPubsubMetrics(server);
    assert.ok(metrics[0].pubs.postsList.lifeTime > 300);
    done();
  });

  test('count', function(done, server, client) {
    server.evalSync(function() {
      Posts = new Meteor.Collection('posts');
      Meteor.publish('postsList', function() {
        return Posts.find();
      });
      emit('return');
    });

    client.evalSync(function() {
      var h1 = Meteor.subscribe('postsList', function() {
        var h2 = Meteor.subscribe('postsList', function() {
          emit('return');
        });
      }); 
    });


    server.evalSync(function() {
      emit('return');
    });

    var payload = GetPubsubPayload(server);
    assert.equal(payload[0].pubs.postsList.count, 2);
    done();
  });

});