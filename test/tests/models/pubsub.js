var assert = require('assert');

suite('Pubsub Model', function() {
  suite('._getMetrics', function() {
    test('same date', function(done, server) {
      var metrics = server.evalSync(function() {
        var pub = "postsList";
        var d = new Date('2013 Dec 10 20:30').getTime();

        var model = new PubsubModel();
        model._getMetrics(d, pub).subs++;
        model._getMetrics(d, pub).subs++;

        emit('return', model._getMetrics(d, pub));
      });

      assert.equal(metrics.subs, 2);
      done();
    });

    test('multi date', function(done, server) {
      var metrics = server.evalSync(function() {
        var pub = "postsList";
        var d1 = new Date('2013 Dec 10 20:31:12').getTime();
        var d2 = new Date('2013 Dec 11 20:31:10').getTime();

        var model = new PubsubModel();
        model._getMetrics(d1, pub).subs++;
        model._getMetrics(d1, pub).subs++;
        model._getMetrics(d2, pub).subs++;

        emit('return', [
          model._getMetrics(d1, pub),
          model._getMetrics(d2, pub)
        ]);
      });

      assert.equal(metrics[0].subs, 2);
      assert.equal(metrics[1].subs, 1);
      done();
    });

    test('multi date: same minute', function(done, server) {
      var metrics = server.evalSync(function() {
        var pub = "postsList";
        var d1 = new Date('2013 Dec 10 20:31:12').getTime();
        var d2 = new Date('2013 Dec 10 20:31:40').getTime();

        var model = new PubsubModel();
        model._getMetrics(d1, pub).subs++;
        model._getMetrics(d1, pub).subs++;
        model._getMetrics(d2, pub).subs++;

        emit('return', [
          model._getMetrics(d1, pub),
          model._getMetrics(d2, pub)
        ]);
      });

      assert.equal(metrics[0].subs, 3);
      assert.equal(metrics[1].subs, 3);
      assert.deepEqual(metrics[0], metrics[1]);
      done();
    });
  });
});