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

  test('resTime: multiple .ready()', function(done, server, client) {
    server.evalSync(function() {
      Posts = new Meteor.Collection('posts');
      var doneOnce = false;
      Meteor.publish('postsList', function() {
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
            done();
          }, 200);
        })();
      });
      emit('return');
    });

    client.evalSync(function() {
      Meteor.subscribe('postsList', function() {
        emit('return');
      }); 
    });

    var metrics = GetPubsubPayload(server);
    var resTimeOne = metrics[0].pubs.postsList.resTime;

    Wait(server, 600);

    client.evalSync(function() {
      Meteor.subscribe('postsList'); 
      emit('return');
    });

    //wait until sub get sent to the server
    Wait(server, 200);
    var metrics2 = GetPubsubPayload(server);

    var resTimeTwo = metrics2[0].pubs.postsList.resTime;
    assert.equal(resTimeTwo, 0);

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

  test('lifeTime for null subs', function(done, server, client) {
    //wait for client to get connected to the server
    client.evalSync(function() {
      Deps.autorun(function() {
        var status = Meteor.status();
        if(status.connected) {
          emit('return');
        }
      });
    });

    server.evalSync(function() {
      Posts = new Meteor.Collection('posts');
      Meteor.publish(null, function() {
        return Posts.find();
      });
      emit('return');
    });

    Wait(server, 600);

    //close client sessions
    server.evalSync(function() {
      _.each(Meteor.default_server.sessions, function(session) {
        Meteor.default_server._closeSession(session);
      });
      emit('return');
    });

    var metrics = GetPubsubMetrics(server);
    
    assert.ok(metrics[0].pubs['null(autopublish)'].lifeTime > 600);
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