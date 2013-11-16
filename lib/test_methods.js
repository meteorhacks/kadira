Posts = new Meteor.Collection('posts');
Future = Npm.require('fibers/future');

Meteor.methods({
  hello: function() {
    var content =  HTTP.get('http://localhost:3000');
    Posts.insert({aa: 100});
    var cnt =  Posts.find({}).fetch();

    Meteor._wrapAsync(wait)(1000);
    return cnt;
  },

  async: function() {
    var waitSync = Future.wrap(wait);
    waitSync(1000).wait();
    return 2000;
  }
});

function wait(time, done) {
  setTimeout(function() {
    done();
  }, time)
}