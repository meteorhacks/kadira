Posts = new Meteor.Collection('posts');

Meteor.methods({
  hello: function() {
    Posts.insert({aa: 100});
    return Posts.find({}).count();
  }
});