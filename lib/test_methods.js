Posts = new Meteor.Collection('posts');

Meteor.methods({
  hello: function() {
    var content =  HTTP.get('http://localhost:3000');
    Posts.insert({aa: 100});
    return Posts.find({}).count();
  }
});