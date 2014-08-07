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

RunWithFiber = function (callback) {
  if(Fiber.current) {
    return doCall();
  } else {
    // can't return value
    Fiber(doCall).run();
  }

  function doCall() {
    return callback();
  }
}

DefaultUniqueId = new UniqueId();
