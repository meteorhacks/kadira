var Fiber = Npm.require('fibers');

HaveAsyncCallback = function(args) {
  var lastArg = args[args.length -1];
  return (typeof lastArg) == 'function';
};

UniqueId = function(start) {
  this.id = 0;
}

UniqueId.prototype.get = function() {
  return "" + this.id++;
};

DefaultUniqueId = new UniqueId();

// User new, documented Meteor.wrapAsync while supporting older versions
// of Meteor that only have Meteor._wrapAsync
wrapAsync = Meteor.wrapAsync || Meteor._wrapAsync;
