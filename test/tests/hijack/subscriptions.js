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

    //wait NTP get synced
    Wait(server, 600);

    client.evalSync(function() {
      h1 = Meteor.subscribe('postsList', function() {
        emit('return');
      }); 
    });

    Wait(server, 600);
    client.evalSync(function() {
      h1.stop();
      emit('return');
    });

    Wait(server, 100);
    var metrics = GetPubsubMetrics(server);
    
    assert.ok(metrics[0].pubs.postsList.lifeTime > 600);
    done();
  });

  test('activeSubs', function(done, server, client) {
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

    var payload = GetPubsubPayload(server);
    var expectedSubs = 3; //meteor_autoupdate_clientVersions + 2
    assert.equal(payload[0].pubs.postsList.activeSubs, 3);
    done();
  });

  test('networkImpact:added', function(done, server, client) {
    //_id is not calculated
    var docs = [
      {data: 'data1'},
      {data: 'data2'}
    ];

    server.evalSync(function(docs) {
      Posts = new Meteor.Collection('posts');
      docs.forEach(function(doc) {
        Posts.insert(doc);
      });

      Meteor.publish('postsList', function() {
        return Posts.find();
      });
      emit('return');
    }, docs);

    client.evalSync(function() {
      var h1 = Meteor.subscribe('postsList', function() {
        emit('return');
      }); 
    });

    Wait(server, 200);

    var metrics = GetPubsubMetrics(server);
    assert.equal(metrics[0].pubs.postsList.networkImpact, getDataSize(docs));
    done();
  });

  test('networkImpact:added - in async', function(done, server, client) {
    //_id is not calculated
    var docs = [
      {data: 'data1'},
      {data: 'data2'}
    ];

    server.evalSync(function(docs) {
      Posts = new Meteor.Collection('posts');
      docs.forEach(function(doc) {
        Posts.insert(doc);
      });

      Meteor.publish('postsList', function() {
        var self = this;
        setTimeout(function() {
          self.added('posts', 'id1', {data: 'data1'})
          self.added('posts', 'id2', {data: 'data2'})
          self.ready();
        }, 200);
      });
      emit('return');
    }, docs);

    client.evalSync(function() {
      var h1 = Meteor.subscribe('postsList', function() {
        emit('return');
      }); 
    });

    Wait(server, 200);

    var metrics = GetPubsubMetrics(server);
    assert.equal(metrics[0].pubs.postsList.networkImpact, getDataSize(docs));
    done();
  });

  test('networkImpact:added multi-subscriptions', function(done, server, client) {
    //_id is not calculated
    var docs = [
      {data: 'data1'},
      {data: 'data2'}
    ];

    server.evalSync(function(docs) {
      Posts = new Meteor.Collection('posts');
      docs.forEach(function(doc) {
        Posts.insert(doc);
      });

      Meteor.publish('postsList', function() {
        return Posts.find();
      });
      emit('return');
    }, docs);

    client.evalSync(function() {
      var h1 = Meteor.subscribe('postsList', function() {
        var h2 = Meteor.subscribe('postsList', function() {
          emit('return');
        });
      }); 
    });

    Wait(server, 200);

    var metrics = GetPubsubMetrics(server);
    assert.equal(metrics[0].pubs.postsList.networkImpact, getDataSize(docs));
    done();
  });
  
  test('networkImpact:updated', function(done, server, client) {
    var docs = [
      {abc: 10},
      {bbc: 20}
    ];
    server.evalSync(function() {
      Posts = new Meteor.Collection('posts');
      Posts.insert({_id: 'aa', abc: 10});

      Meteor.publish('postsList', function() {
        return Posts.find();
      });
      emit('return');
    }, docs);

    client.evalSync(function() {
      var h1 = Meteor.subscribe('postsList', function() {
        emit('return');
      }); 
    });

    server.evalSync(function() {
      Posts.update({_id: 'aa'}, {$set: {bbc: 10}});
      emit('return');
    });

    Wait(server, 200);

    var metrics = GetPubsubMetrics(server);
    assert.equal(metrics[0].pubs.postsList.networkImpact, getDataSize(docs));
    done();
  });

  test('networkImpact:removed', function(done, server, client) {
    var docs = [
      {abc: 10}
    ];
    server.evalSync(function() {
      Posts = new Meteor.Collection('posts');
      Posts.insert({_id: 'aa', abc: 10});

      Meteor.publish('postsList', function() {
        return Posts.find();
      });
      emit('return');
    }, docs);

    client.evalSync(function() {
      var h1 = Meteor.subscribe('postsList', function() {
        emit('return');
      }); 
    });

    server.evalSync(function() {
      Posts.remove({_id: 'aa'});
      emit('return');
    });

    Wait(server, 200);

    var metrics = GetPubsubMetrics(server);
    assert.equal(metrics[0].pubs.postsList.networkImpact, getDataSize(docs));
    done();
  });

});


function getDataSize(docs) {
  var size = 0;
  docs.forEach(function(doc) {
    size+= Buffer.byteLength(JSON.stringify(doc));
  });
  return size;
}